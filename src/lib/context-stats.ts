import type { DailyPlan, MacroGoal, Task } from "@/lib/db-types";
import { computeExecutionRate, formatExecutionRatePercent } from "@/lib/execution-rate";

export interface PillarStats {
  done: number;
  missed: number;
  pending: number;
}

function slugForTask(task: Task, goalById: Map<string, MacroGoal>): string {
  if (!task.macro_goal_id) return "—";
  return goalById.get(task.macro_goal_id)?.slug ?? "—";
}

import { resolveWorkClient } from "@/lib/work-context";

function sourceTag(task: Task): string {
  if (task.source === "cursor") return "cursor";
  if (task.source === "standard") return "standard";
  return "manual";
}

function cleanTaskName(name: string): string {
  return name.replace(/\s*·\s*via cursor(\s*·\s*via cursor)*$/i, "").trim();
}

export function buildExecutionSummaryBlock(
  tasks: Task[],
  plans: DailyPlan[],
  goals: MacroGoal[],
): string[] {
  const lines: string[] = [];
  const done = tasks.filter((t) => t.status === "done").length;
  const missed = tasks.filter((t) => t.status === "missed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const lockedPlans = new Set(plans.filter((p) => p.is_locked).map((p) => p.id));
  const openPending = tasks.filter(
    (t) => t.status === "pending" && !lockedPlans.has(t.daily_plan_id),
  ).length;

  const overall = computeExecutionRate({ done, missed, pending: openPending }, openPending === 0);
  const rateStr = formatExecutionRatePercent(overall.rate) ?? "n/a";

  lines.push("## Execution summary · last 7 days");
  lines.push(
    `- Overall: ${done} done / ${missed} missed / ${pending} pending · execution rate ${rateStr}${overall.isOpen ? " (day still open)" : ""}`,
  );
  if (missed + done > 0 && missed / (missed + done) >= 0.5) {
    lines.push(
      `- Early-system band: high miss rate is expected — mutate tasks/rules, do not blame character`,
    );
  }

  const goalById = new Map(goals.map((g) => [g.id, g] as const));
  const byPillar = new Map<string, PillarStats>();
  const work = { done: 0, missed: 0, pending: 0 };
  const personal = { done: 0, missed: 0, pending: 0 };

  for (const t of tasks) {
    const slug = slugForTask(t, goalById);
    if (!byPillar.has(slug)) byPillar.set(slug, { done: 0, missed: 0, pending: 0 });
    const bucket = byPillar.get(slug)!;
    bucket[t.status]++;

    const bucket2 = (t.category ?? "personal") === "work" ? work : personal;
    bucket2[t.status]++;
  }

  const pillarParts = [...byPillar.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, s]) => `${slug}:${s.done}/${s.done + s.missed + s.pending}`);
  lines.push(`- By pillar: ${pillarParts.join(" · ")}`);
  lines.push(
    `- By category: personal ${personal.done}/${personal.done + personal.missed + personal.pending} · work ${work.done}/${work.done + work.missed + work.pending}`,
  );
  lines.push("");
  return lines;
}

export function buildRecurringMissesBlock(
  tasks: Task[],
  goals: MacroGoal[],
  minDays = 2,
): string[] {
  const goalById = new Map(goals.map((g) => [g.id, g] as const));
  const missedNames = new Map<string, { count: number; slug: string; sampleId: string }>();

  for (const t of tasks) {
    if (t.status !== "missed") continue;
    const key = cleanTaskName(t.task_name).toLowerCase();
    const existing = missedNames.get(key);
    if (existing) {
      existing.count++;
    } else {
      missedNames.set(key, {
        count: 1,
        slug: slugForTask(t, goalById),
        sampleId: t.id,
      });
    }
  }

  const recurring = [...missedNames.entries()]
    .filter(([, v]) => v.count >= minDays)
    .sort((a, b) => b[1].count - a[1].count);

  if (recurring.length === 0) return [];

  const lines: string[] = [
    "## Recurring misses · system flaws (same task missed across days)",
  ];
  for (const [name, { count, slug, sampleId }] of recurring) {
    lines.push(
      `- (${slug}) "${name}" · missed ${count}x in window (sample id:${sampleId})`,
    );
  }
  lines.push("");
  return lines;
}

export function formatTaskLine(task: Task, goalById: Map<string, MacroGoal>): string {
  const slug = slugForTask(task, goalById);
  const client = resolveWorkClient(task);
  const work =
    (task.category ?? "personal") === "work"
      ? client
        ? ` [WORK:${client}]`
        : " [WORK]"
      : "";
  const tag = sourceTag(task);
  const name = cleanTaskName(task.task_name);
  return `- [${task.status}] (${slug})${work} (id:${task.id}) ${name} · ${tag}`;
}

export function formatDayTaskSummary(
  date: string,
  dayTasks: Task[],
  _goalById: Map<string, MacroGoal>,
): string {
  const done = dayTasks.filter((t) => t.status === "done").length;
  const missed = dayTasks.filter((t) => t.status === "missed").length;
  const pending = dayTasks.filter((t) => t.status === "pending").length;

  const missedNames = [
    ...new Set(
      dayTasks
        .filter((t) => t.status === "missed")
        .map((t) => cleanTaskName(t.task_name))
        .slice(0, 8),
    ),
  ];
  const doneNames = dayTasks
    .filter((t) => t.status === "done")
    .map((t) => cleanTaskName(t.task_name))
    .slice(0, 5);

  let line = `### ${date} · ${done} done / ${missed} missed / ${pending} pending`;
  if (doneNames.length) line += `\n- Done: ${doneNames.join("; ")}`;
  if (missedNames.length) {
    line += `\n- Missed (sample): ${missedNames.join("; ")}${missed > missedNames.length ? "…" : ""}`;
  }
  const cursorTasks = dayTasks.filter((t) => t.source === "cursor");
  if (cursorTasks.length > 0) {
    line += `\n- Cursor tasks that day: ${cursorTasks.length}`;
  }
  return line;
}

/** Full task lines for recent days; summary-only for older days to cut payload size. */
export function buildTaskExecutionBlock(
  tasks: Task[],
  plans: DailyPlan[],
  goals: MacroGoal[],
  detailDays = 3,
): string[] {
  const lines: string[] = [];
  const done = tasks.filter((t) => t.status === "done").length;
  const missed = tasks.filter((t) => t.status === "missed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  lines.push(`## Task execution · last 7 days (${done} done / ${missed} missed / ${pending} pending)`);
  lines.push(`(Full detail: last ${detailDays} days · older days summarized)`);
  lines.push("");

  const planById = new Map(plans.map((p) => [p.id, p] as const));
  const goalById = new Map(goals.map((g) => [g.id, g] as const));
  const tasksByPlanDate = new Map<string, Task[]>();

  for (const t of tasks) {
    const p = planById.get(t.daily_plan_id);
    const key = p?.plan_date ?? "unknown";
    if (!tasksByPlanDate.has(key)) tasksByPlanDate.set(key, []);
    tasksByPlanDate.get(key)!.push(t);
  }

  const sortedDates = Array.from(tasksByPlanDate.keys()).sort();
  const recentCutoff =
    sortedDates.length <= detailDays
      ? sortedDates[0]
      : sortedDates[sortedDates.length - detailDays];

  for (const d of sortedDates) {
    const dayTasks = tasksByPlanDate.get(d)!;
    if (d >= recentCutoff) {
      lines.push(`### ${d}`);
      for (const t of dayTasks) {
        lines.push(formatTaskLine(t, goalById));
      }
    } else {
      lines.push(formatDayTaskSummary(d, dayTasks, goalById));
    }
    lines.push("");
  }

  return lines;
}
