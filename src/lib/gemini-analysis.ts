import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import {
  getGeminiApiKey,
  getGeminiModel,
  getGeminiFallbackModels,
  isThinkingCapableModel,
  getThinkingBudget,
} from "@/lib/analysis-env";

// Errors that warrant a retry (rate limit, overload, transient server faults).
const RETRYABLE =
  /\b(503|429|500|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|quota)\b/i;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Jittered exponential back-off: base * 2^(attempt-1) ± 20 % noise. */
function backoffMs(attempt: number, baseMs = 2000): number {
  const exp = baseMs * Math.pow(2, attempt - 1);
  const jitter = exp * 0.2 * (Math.random() * 2 - 1);
  return Math.min(Math.round(exp + jitter), 30_000);
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return RETRYABLE.test(msg);
}

/**
 * Build generation config for a given model.
 *
 * Gemini 2.5 Pro supports extended thinking (thinkingConfig). The model reasons
 * internally before producing the final JSON — we never see the thinking tokens,
 * but the output quality improves significantly. Flash / flash-lite skip this.
 *
 * Note: thinkingConfig is not yet in the @google/generative-ai 0.24.x TypeScript
 * types but is accepted by the API server, so we cast via unknown.
 */
function buildGenerationConfig(modelName: string): GenerationConfig {
  const base: GenerationConfig = {
    responseMimeType: "application/json",
    // Lower temperature for Pro → more deterministic, consistent JSON.
    // Flash models get slightly higher temperature to compensate for smaller reasoning.
    temperature: isThinkingCapableModel(modelName) ? 0.3 : 0.4,
  };

  if (isThinkingCapableModel(modelName)) {
    const budget = getThinkingBudget();
    // thinkingConfig is passed through as-is by the SDK (object is JSON-serialised);
    // the TypeScript cast is safe because the Gemini API accepts the field.
    return {
      ...base,
      ...(({
        thinkingConfig: {
          thinkingBudget: budget,
        },
      }) as unknown as Partial<GenerationConfig>),
    };
  }

  return base;
}

async function callModelOnce(
  genAI: GoogleGenerativeAI,
  modelName: string,
  payload: string,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: buildGenerationConfig(modelName),
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: payload }] }],
  });

  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error(`Gemini (${modelName}) returned an empty response.`);
  }
  return text;
}

/**
 * Retry a single model with jittered exponential back-off.
 * Pro models are given more attempts (4) and a longer initial wait because
 * they take more time per call and are more likely to hit transient overload.
 */
async function callModelWithRetries(
  genAI: GoogleGenerativeAI,
  modelName: string,
  payload: string,
): Promise<string> {
  const isPro = isThinkingCapableModel(modelName);
  const maxAttempts = isPro ? 4 : 3;
  const baseBackoffMs = isPro ? 3000 : 2000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callModelOnce(genAI, modelName, payload);
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxAttempts) break;
      const wait = backoffMs(attempt, baseBackoffMs);
      await sleep(wait);
    }
  }
  throw lastError;
}

/**
 * Call Gemini with automatic model fallback.
 *
 * Model chain (configurable via env):
 *   Primary   → gemini-2.5-pro   (deep reasoning + thinking budget)
 *   Fallback1 → gemini-2.5-flash  (fast, capable, no thinking)
 *   Fallback2 → gemini-2.5-flash-lite (cheapest escape hatch)
 *
 * Non-retryable errors (e.g. invalid key, bad request) abort the chain immediately.
 */
export async function callGeminiAnalysis(payload: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Deduplicate while preserving order (primary first, then fallbacks).
  const models = [getGeminiModel(), ...getGeminiFallbackModels()].filter(
    (m, i, arr) => arr.indexOf(m) === i,
  );

  const errors: string[] = [];

  for (const modelName of models) {
    try {
      return await callModelWithRetries(genAI, modelName, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${modelName}: ${msg}`);
      // If the error is not transient (bad key, bad request, etc.) don't try
      // subsequent models — they'll fail for the same reason.
      if (!isRetryableError(err)) break;
    }
  }

  const detail = errors.join(" · ");
  if (/high demand|503|UNAVAILABLE|overloaded/i.test(detail)) {
    throw new Error(
      `Gemini is temporarily overloaded (503). Retried ${models.length} model(s) — wait a few minutes and try again, or set GEMINI_MODEL=gemini-2.5-flash in .env.local. Details: ${detail}`,
    );
  }

  throw new Error(detail || "Gemini analysis failed.");
}
