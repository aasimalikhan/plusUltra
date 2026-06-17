export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

/** Primary model. Defaults to gemini-2.5-pro for deep nightly reasoning. */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-pro";
}

/**
 * Fallback chain tried in order when the primary hits 503/429.
 * Override: GEMINI_FALLBACK_MODELS=model-a,model-b
 * Default: flash first (capable + fast), then flash-lite (cheapest escape hatch).
 */
export function getGeminiFallbackModels(): string[] {
  const raw = process.env.GEMINI_FALLBACK_MODELS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }
  return ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
}

export function isGeminiConfigured(): boolean {
  return !!getGeminiApiKey();
}

export function getCronSecret(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || undefined;
}

/** IANA timezone for date boundaries (midnight lock, analysis run_date). */
export function getAppTimezone(): string {
  return process.env.PLUSULTRA_TIMEZONE?.trim() || "America/New_York";
}

/**
 * True for models that support extended thinking (thinkingConfig).
 * Pro always thinks; Flash can think (don't force it — let the model decide);
 * Flash-lite does not support thinking.
 */
export function isThinkingCapableModel(modelName: string): boolean {
  return /gemini-2\.[5-9]-pro/i.test(modelName);
}

/**
 * Token budget for internal thinking on thinking-capable models.
 * Override: GEMINI_THINKING_BUDGET=<tokens>  (0 = disable, -1 = auto)
 * Default: 8000 — enough for thorough nightly reasoning without ballooning cost.
 */
export function getThinkingBudget(): number {
  const raw = process.env.GEMINI_THINKING_BUDGET?.trim();
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return 8000;
}
