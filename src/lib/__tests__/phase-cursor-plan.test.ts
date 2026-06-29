import { describe, expect, it } from "vitest";
import {
  parseAndValidateCursorPlan,
  parseCursorPlanJson,
  validateCursorPlan,
} from "@/lib/cursor-plan-validation";

const SLUGS = new Set(["RICH", "MUSCULAR", "INTELLIGENT"]);

describe("Phase 3 · cursor / analysis JSON", () => {
  it("parses JSON with markdown fences", () => {
    const raw = '```json\n{"summary":"ok","tomorrow_tasks":[]}\n```';
    const r = parseCursorPlanJson(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((r.parsed as { summary: string }).summary).toBe("ok");
    }
  });

  it("rejects invalid JSON", () => {
    expect(parseCursorPlanJson("{ bad").ok).toBe(false);
  });

  it("validates macro_goal_slug against user goals", () => {
    const plan = {
      summary: "test",
      tomorrow_tasks: [{ macro_goal_slug: "INVALID", task_name: "x" }],
    };
    const v = validateCursorPlan(plan, SLUGS);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toContain("INVALID");
  });

  it("accepts work category on tomorrow tasks", () => {
    const plan = {
      summary: "test",
      tomorrow_tasks: [
        {
          macro_goal_slug: "RICH",
          task_name: "Verizon release checklist",
          category: "work",
        },
      ],
    };
    const v = validateCursorPlan(plan, SLUGS);
    expect(v.ok).toBe(true);
  });

  it("rejects short cited id prefixes", () => {
    const plan = {
      summary: "test",
      cited_journal_ids: ["b022c94e"],
      tomorrow_tasks: [{ macro_goal_slug: "RICH", task_name: "x" }],
    };
    const v = validateCursorPlan(plan, SLUGS);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toContain("full UUID");
  });

  it("accepts full cited uuids", () => {
    const plan = {
      summary: "test",
      cited_journal_ids: ["b022c94e-3aa5-495f-a671-fd20b2794d17"],
      cited_task_ids: ["11a0be9d-fba9-4cbd-977f-c3424054d7ec"],
      tomorrow_tasks: [{ macro_goal_slug: "RICH", task_name: "x" }],
    };
    const v = validateCursorPlan(plan, SLUGS);
    expect(v.ok).toBe(true);
  });

  it("accepts is_anti_task and friction_level on tomorrow tasks", () => {
    const plan = {
      summary: "test",
      tomorrow_tasks: [
        {
          macro_goal_slug: "INTELLIGENT",
          task_name: "Do not open Twitter before noon",
          is_anti_task: true,
          friction_level: 2,
        },
        {
          macro_goal_slug: "RICH",
          task_name: "Ship auth refactor",
          friction_level: 3,
        },
      ],
    };
    const v = validateCursorPlan(plan, SLUGS);
    expect(v.ok).toBe(true);
  });

  it("rejects more than two friction_level 3 tasks", () => {
    const plan = {
      summary: "test",
      tomorrow_tasks: [
        { macro_goal_slug: "RICH", task_name: "a", friction_level: 3 },
        { macro_goal_slug: "RICH", task_name: "b", friction_level: 3 },
        { macro_goal_slug: "RICH", task_name: "c", friction_level: 3 },
      ],
    };
    const v = validateCursorPlan(plan, SLUGS);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toContain("friction_level: 3");
  });

  it("rejects invalid friction_level", () => {
    const plan = {
      summary: "test",
      tomorrow_tasks: [{ macro_goal_slug: "RICH", task_name: "x", friction_level: 4 }],
    };
    const v = validateCursorPlan(plan, SLUGS);
    expect(v.ok).toBe(false);
  });

  it("parseAndValidateCursorPlan end-to-end", () => {
    const raw = JSON.stringify({
      summary: "week review",
      tomorrow_tasks: [{ macro_goal_slug: "MUSCULAR", task_name: "Gym 7am" }],
      rule_changes: { add: [{ rule_text: "Sleep by 11", priority: 15 }] },
    });
    const v = parseAndValidateCursorPlan(raw, SLUGS);
    expect(v.ok).toBe(true);
  });
});
