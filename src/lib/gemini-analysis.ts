import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getGeminiApiKey,
  getGeminiModel,
  getGeminiFallbackModels,
} from "@/lib/analysis-env";

const RETRYABLE = /\b(503|429|500|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand)\b/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return RETRYABLE.test(msg);
}

async function callModelOnce(
  genAI: GoogleGenerativeAI,
  modelName: string,
  payload: string,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
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

async function callModelWithRetries(
  genAI: GoogleGenerativeAI,
  modelName: string,
  payload: string,
  maxAttempts = 3,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callModelOnce(genAI, modelName, payload);
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxAttempts) break;
      await sleep(2000 * attempt);
    }
  }
  throw lastError;
}

export async function callGeminiAnalysis(payload: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
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
      if (!isRetryableError(err)) break;
    }
  }

  const detail = errors.join(" · ");
  if (/high demand|503|UNAVAILABLE/i.test(detail)) {
    throw new Error(
      `Gemini is temporarily overloaded (503). Retried ${models.length} model(s) — wait a few minutes and try again, or set GEMINI_MODEL=gemini-2.5-flash-lite in .env.local. Details: ${detail}`,
    );
  }

  throw new Error(detail || "Gemini analysis failed.");
}
