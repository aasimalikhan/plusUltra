export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

/** Tried in order when primary model hits 503/429. Override: GEMINI_FALLBACK_MODELS=a,b */
export function getGeminiFallbackModels(): string[] {
  const raw = process.env.GEMINI_FALLBACK_MODELS?.trim();
  if (raw) {
    return raw.split(",").map((m) => m.trim()).filter(Boolean);
  }
  return ["gemini-2.5-flash-lite"];
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
