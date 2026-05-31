import type { DeadlineGoal, DeadlineMilestone } from "@/lib/db-types";

export type DeadlineStatus = DeadlineGoal["status"];

export function daysUntilDate(d: string | null): number | null {
  if (!d) return null;
  const target = new Date(d + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDaysUntil(d: string | null): string | null {
  const days = daysUntilDate(d);
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "1d left";
  return `${days}d left`;
}

/** Higher = more urgent. Overdue and high-importance goals float to top. */
export function urgencyScore(goal: Pick<DeadlineGoal, "target_date" | "importance">): number {
  const days = daysUntilDate(goal.target_date) ?? 999;
  const overdueBoost = days < 0 ? 1000 + Math.abs(days) * 10 : 0;
  const proximity = days <= 0 ? 500 : Math.max(0, 120 - days);
  return overdueBoost + proximity + goal.importance * 20;
}

export function milestoneProgress(milestones: Pick<DeadlineMilestone, "is_done">[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.is_done).length;
  return Math.round((done / milestones.length) * 100);
}

export function urgencyLabel(days: number | null): "overdue" | "critical" | "soon" | "normal" {
  if (days === null) return "normal";
  if (days < 0) return "overdue";
  if (days <= 7) return "critical";
  if (days <= 21) return "soon";
  return "normal";
}

export function importanceLabel(n: number): string {
  if (n >= 5) return "Critical";
  if (n >= 4) return "High";
  if (n >= 3) return "Medium";
  if (n >= 2) return "Low";
  return "Minimal";
}
