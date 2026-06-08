import type { Task } from "@/lib/db-types";
import { DEFAULT_STANDARD_TASKS } from "@/lib/standard-tasks";

const STANDARD_NAMES = new Set(
  DEFAULT_STANDARD_TASKS.map((t) => t.task_name.toLowerCase()),
);

export function taskCategory(task: Task): "personal" | "work" {
  return task.category ?? "personal";
}

export function isPersonalTask(task: Task): boolean {
  return taskCategory(task) !== "work";
}

export function isWorkTask(task: Task): boolean {
  return taskCategory(task) === "work";
}

/** Personal RICH tasks that look like Verizon work — offer one-click promote. */
export function isWorkCandidate(
  task: Task,
  richGoalId: string | undefined,
): boolean {
  if (!isPersonalTask(task)) return false;
  if (task.macro_goal_id !== richGoalId) return false;
  if (task.source === "standard") return false;
  if (STANDARD_NAMES.has(task.task_name.trim().toLowerCase())) return false;
  return true;
}

/** Filter tasks for 14-day / today stats by category. */
export function countTasksByStatus(
  rows: Array<{ status: string; category?: string | null }>,
  category?: "personal" | "work",
): { done: number; missed: number; pending: number } {
  let done = 0;
  let missed = 0;
  let pending = 0;
  for (const row of rows) {
    const cat = row.category ?? "personal";
    if (category === "personal" && cat === "work") continue;
    if (category === "work" && cat !== "work") continue;
    if (row.status === "done") done++;
    else if (row.status === "missed") missed++;
    else pending++;
  }
  return { done, missed, pending };
}
