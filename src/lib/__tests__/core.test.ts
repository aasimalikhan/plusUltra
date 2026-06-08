import { describe, expect, it } from "vitest";
import { computeExecutionRate, formatExecutionRatePercent } from "@/lib/execution-rate";
import {
  emotionalImpactBand,
  isVagueRepair,
  repairQualityHint,
} from "@/lib/journal-validation";
import { buildCursorContextMarkdown } from "@/lib/context-formatter";
import type { ContextBundle } from "@/lib/context-formatter";

describe("computeExecutionRate", () => {
  it("locked day: done / (done + missed), pending excluded", () => {
    const r = computeExecutionRate({ done: 7, missed: 0, pending: 7 }, true);
    expect(r.isOpen).toBe(false);
    expect(r.rate).toBe(1);
  });

  it("open day with pending: includes pending in denominator", () => {
    const r = computeExecutionRate({ done: 7, missed: 0, pending: 7 }, false);
    expect(r.isOpen).toBe(true);
    expect(r.rate).toBe(0.5);
    expect(formatExecutionRatePercent(r.rate)).toBe("50%");
  });

  it("returns null rate when no resolved tasks on locked day", () => {
    const r = computeExecutionRate({ done: 0, missed: 0, pending: 5 }, true);
    expect(r.rate).toBeNull();
  });
});

describe("journal validation", () => {
  it("flags vague repairs", () => {
    expect(isVagueRepair("work harder")).toBe(true);
    expect(isVagueRepair("just stop")).toBe(true);
    expect(
      isVagueRepair("30 min DSA at 7am before opening Cursor IDE"),
    ).toBe(false);
  });

  it("returns hint for vague repair", () => {
    expect(repairQualityHint("work harder")).toContain("Too vague");
    expect(repairQualityHint("30 min cardio before 7pm")).toBeNull();
  });

  it("maps emotional impact bands", () => {
    expect(emotionalImpactBand(10)).toBe("Low");
    expect(emotionalImpactBand(50)).toBe("Moderate");
    expect(emotionalImpactBand(90)).toBe("Severe");
  });
});

describe("buildCursorContextMarkdown", () => {
  const emptyBundle: ContextBundle = {
    plans: [],
    tasks: [],
    journal: [],
    rules: [],
    goals: [{ id: "g1", user_id: "u", slug: "RICH", title: "RICH", visual_anchor_url: null, deadline: null, sort_order: 0, created_at: "" }],
    runs: [],
    deadlines: [],
    workContext: "Verizon engineer on GEMS project",
    templates: [{ task_name: "Studied System Design", category: "personal", is_active: true }],
  };

  it("includes work context and templates", () => {
    const md = buildCursorContextMarkdown(emptyBundle);
    expect(md).toContain("Work context");
    expect(md).toContain("Verizon engineer");
    expect(md).toContain("Studied System Design");
  });
});
