import { describe, expect, it } from "vitest";
import {
  ANALYSIS_PROVIDERS,
  buildProviderPrompt,
  getAnalysisProvider,
} from "@/lib/analysis-providers";
import {
  buildCursorFullPayload,
  buildCursorContextMarkdown,
  CURSOR_ANALYST_PROMPT,
} from "@/lib/context-formatter";
import { ATTACK_MODE_ANALYST_FRAMEWORK, PLUSULTRA_APP_BRIEFING } from "@/lib/app-briefing";

describe("Phase 4 · analysis bridge", () => {
  it("supports cursor, gemini, chatgpt", () => {
    expect(ANALYSIS_PROVIDERS.map((p) => p.id)).toEqual([
      "cursor",
      "gemini",
      "chatgpt",
    ]);
  });

  it("appends provider notes for non-cursor", () => {
    const base = "analyst prompt";
    expect(buildProviderPrompt(base, "cursor")).toBe(base);
    expect(buildProviderPrompt(base, "gemini")).toContain("Gemini");
    expect(getAnalysisProvider("chatgpt").label).toBe("ChatGPT");
  });

  it("full payload includes briefing, prompt, and live data", () => {
    const empty = {
      plans: [],
      tasks: [],
      journal: [],
      rules: [],
      goals: [],
      runs: [],
      deadlines: [],
      captures: [],
    };
    const md = buildCursorContextMarkdown(empty);
    const full = buildCursorFullPayload(empty);
    expect(full).toContain(ATTACK_MODE_ANALYST_FRAMEWORK.slice(0, 40));
    expect(full).toContain(CURSOR_ANALYST_PROMPT.slice(0, 40));
    expect(full).toContain("LIVE DATA");
    expect(full).toContain("Execution summary");
    expect(md).toContain("Deadline goals");
    expect(PLUSULTRA_APP_BRIEFING).toContain("Attack Mode");
  });

  it("includes day captures in live data markdown", () => {
    const md = buildCursorContextMarkdown({
      plans: [],
      tasks: [],
      journal: [],
      rules: [],
      goals: [],
      runs: [],
      deadlines: [],
      captures: [
        {
          id: "abc-123",
          user_id: "u1",
          content: "Reel on sleep hygiene",
          created_at: "2026-06-17T14:00:00Z",
        },
      ],
    });
    expect(md).toContain("Day captures");
    expect(md).toContain("sleep hygiene");
  });
});
