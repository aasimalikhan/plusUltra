import { describe, expect, it } from "vitest";
import {
  buildExecutionSummaryBlock,
  buildRecurringMissesBlock,
  buildTaskExecutionBlock,
} from "@/lib/context-stats";

describe("context-stats", () => {
  const goals = [
    {
      id: "g1",
      user_id: "u",
      slug: "RICH",
      title: "Rich",
      visual_anchor_url: null,
      deadline: null,
      sort_order: 0,
      created_at: "",
    },
  ];

  it("builds execution summary with pillar breakdown", () => {
    const lines = buildExecutionSummaryBlock(
      [
        {
          id: "t1",
          user_id: "u",
          daily_plan_id: "p1",
          macro_goal_id: "g1",
          task_name: "DSA",
          status: "missed",
          completed_at: null,
          source: "standard",
          created_at: "",
        },
        {
          id: "t2",
          user_id: "u",
          daily_plan_id: "p1",
          macro_goal_id: "g1",
          task_name: "Work ticket",
          status: "done",
          completed_at: null,
          source: "manual",
          category: "work",
          created_at: "",
        },
      ],
      [{ id: "p1", user_id: "u", plan_date: "2026-06-17", is_locked: false, created_at: "" }],
      goals,
    );
    expect(lines.join("\n")).toContain("Execution summary");
    expect(lines.join("\n")).toContain("RICH:");
    expect(lines.join("\n")).toContain("work");
  });

  it("detects recurring misses", () => {
    const task = (id: string, date: string) => ({
      id,
      user_id: "u",
      daily_plan_id: date,
      macro_goal_id: "g1",
      task_name: "Hit the gym",
      status: "missed" as const,
      completed_at: null,
      source: "standard" as const,
      created_at: "",
    });
    const lines = buildRecurringMissesBlock(
      [task("t1", "p1"), task("t2", "p2"), task("t3", "p3")],
      goals,
    );
    expect(lines.join("\n")).toContain("Recurring misses");
    expect(lines.join("\n")).toContain("hit the gym");
    expect(lines.join("\n")).toContain("3x");
  });

  it("summarizes older days and details recent days", () => {
    const plans = [
      { id: "p1", user_id: "u", plan_date: "2026-06-10", is_locked: true, created_at: "" },
      { id: "p2", user_id: "u", plan_date: "2026-06-15", is_locked: true, created_at: "" },
      { id: "p3", user_id: "u", plan_date: "2026-06-16", is_locked: true, created_at: "" },
      { id: "p4", user_id: "u", plan_date: "2026-06-17", is_locked: false, created_at: "" },
    ];
    const mk = (id: string, planId: string, status: "done" | "missed" | "pending") => ({
      id,
      user_id: "u",
      daily_plan_id: planId,
      macro_goal_id: "g1",
      task_name: "Task",
      status,
      completed_at: null,
      source: "standard" as const,
      created_at: "",
    });
    const lines = buildTaskExecutionBlock(
      [
        mk("t1", "p1", "missed"),
        mk("t2", "p2", "missed"),
        mk("t3", "p3", "missed"),
        mk("t4", "p4", "pending"),
      ],
      plans,
      goals,
      2,
    );
    const text = lines.join("\n");
    expect(text).toContain("2026-06-10 ·");
    expect(text).toContain("### 2026-06-17");
    expect(text).toContain("(id:t4)");
  });
});
