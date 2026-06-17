export type AnalysisProvider = "cursor" | "gemini" | "chatgpt";

export interface AnalysisProviderConfig {
  id: AnalysisProvider;
  label: string;
  description: string;
  /** Extra instructions appended when using this provider. */
  providerNote: string;
  /** When true, the app can call this provider's API directly (server-side). */
  supportsDirectApi?: boolean;
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
    description:
      "Generate directly via Gemini API (1 call/day) or copy/paste into gemini.google.com.",
    providerNote:
      "You are running inside Google Gemini. Follow the JSON schema exactly. No markdown fences.",
    supportsDirectApi: true,
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
