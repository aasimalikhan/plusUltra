import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/db-types";
import {
  countTasksByStatus,
  isPersonalTask,
  isWorkCandidate,
  isWorkTask,
  taskCategory,
} from "@/lib/task-utils";

function task(partial: Partial<Task> & Pick<Task, "id" | "task_name">): Task {
  return {
    user_id: "u",
    daily_plan_id: "p",
    macro_goal_id: "rich",
    status: "pending",
    completed_at: null,
    source: "manual",
    created_at: "",
    ...partial,
  };
}

describe("Phase 3 · personal vs work tasks", () => {
  it("defaults category to personal", () => {
    expect(taskCategory(task({ id: "1", task_name: "x" }))).toBe("personal");
  });

  it("identifies work tasks", () => {
    const w = task({ id: "1", task_name: "uat build", category: "work" });
    expect(isWorkTask(w)).toBe(true);
    expect(isPersonalTask(w)).toBe(false);
  });

  it("work candidate excludes standards", () => {
    const standard = task({
      id: "1",
      task_name: "Studied System Design",
      macro_goal_id: "rich",
      source: "standard",
    });
    const verizon = task({
      id: "2",
      task_name: "Complete uat build",
      macro_goal_id: "rich",
    });
    expect(isWorkCandidate(standard, "rich")).toBe(false);
    expect(isWorkCandidate(verizon, "rich")).toBe(true);
    expect(isWorkCandidate(verizon, "other")).toBe(false);
  });

  it("countTasksByStatus filters by category", () => {
    const rows = [
      { status: "done", category: "work" },
      { status: "done", category: "personal" },
      { status: "missed", category: "personal" },
    ];
    expect(countTasksByStatus(rows, "work")).toEqual({
      done: 1,
      missed: 0,
      pending: 0,
    });
    expect(countTasksByStatus(rows, "personal")).toEqual({
      done: 1,
      missed: 1,
      pending: 0,
    });
  });
});
