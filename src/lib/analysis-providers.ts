export type AnalysisProvider = "cursor" | "gemini" | "chatgpt";

export interface AnalysisProviderConfig {
  id: AnalysisProvider;
  label: string;
  description: string;
  /** Extra instructions appended when using this provider. */
  providerNote: string;
}

export const ANALYSIS_PROVIDERS: AnalysisProviderConfig[] = [
  {
    id: "cursor",
    label: "Cursor",
    description: "Copy payload → paste in Cursor chat → paste JSON back.",
    providerNote: "",
  },
  {
    id: "gemini",
    label: "Gemini",
    description: "Same payload works in Google Gemini (gemini.google.com or API). Paste JSON back here.",
    providerNote:
      "You are running inside Google Gemini. Follow the JSON schema exactly. No markdown fences.",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    description: "Same payload works in ChatGPT. Paste JSON back here.",
    providerNote:
      "You are running inside ChatGPT. Return ONLY the JSON object — no prose, no code fences.",
  },
];

export function getAnalysisProvider(id: AnalysisProvider): AnalysisProviderConfig {
  return ANALYSIS_PROVIDERS.find((p) => p.id === id) ?? ANALYSIS_PROVIDERS[0];
}

export function buildProviderPrompt(
  basePrompt: string,
  provider: AnalysisProvider,
): string {
  const note = getAnalysisProvider(provider).providerNote;
  if (!note) return basePrompt;
  return `${basePrompt}\n\nProvider note: ${note}`;
}
