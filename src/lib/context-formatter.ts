import { PLUSULTRA_APP_BRIEFING } from "@/lib/app-briefing";
import type {
  AnalysisRun,
  DailyPlan,
  MacroGoal,
  PointedJournal,
  Rule,
  Task,
} from "@/lib/db-types";

export interface ContextBundle {
  plans: DailyPlan[];
  tasks: Task[];
  journal: PointedJournal[];
  rules: Rule[];
  goals: MacroGoal[];
  runs: AnalysisRun[];
}

export const CURSOR_ANALYST_PROMPT = `You are the nightly **logical-brain analyst** for plusUltra (see SYSTEM briefing above).

Read LIVE DATA: last 7 days of tasks (done/missed/pending), pointed journal (triggers, thoughts,
emotional impact %, repairs, schemas), active NEW ME rules (with ids), macro goals + deadlines,
and prior analysis run summaries.

Your job:
1. Identify failure patterns and recurring triggers across the week. Cite specific journal IDs and task IDs.
2. Mutate TOMORROW's task list under the user's macro_goal_slug values listed in LIVE DATA. Pivot on evidence — fix not fixate.
3. Update NEW ME rules: add for repeated patterns; demote stale (higher priority number); deactivate
   resolved patterns by id.
4. Never blame. No generic motivation. Linear, specific, system-focused language only.

Constraints:
- Return ONLY valid JSON. No prose around it. No markdown fences.
- Schema:
{
  "summary": string,
  "cited_journal_ids": string[],
  "cited_task_ids": string[],
  "tomorrow_tasks": [{ "macro_goal_slug": string, "task_name": string }],
  "rule_changes": {
    "add":        [{ "rule_text": string, "priority"?: number }],
    "demote":     [{ "id": string, "priority": number }],
    "deactivate": string[]
  }
}`;

export function buildCursorContextMarkdown(bundle: ContextBundle): string {
  const { plans, tasks, journal, rules, goals, runs } = bundle;

  const lines: string[] = [];
  lines.push(`# LIVE DATA · generated ${new Date().toISOString()}`);
  lines.push(`Plans in window: ${plans.length} · Tasks: ${tasks.length} · Journal entries: ${journal.length} · Prior runs: ${runs.length}`);
  lines.push("");

  lines.push("## Macro goals (valid macro_goal_slug values for tomorrow_tasks)");
  for (const g of goals) {
    const dl = g.deadline ? ` · deadline ${g.deadline}` : "";
    const anchor = g.visual_anchor_url ? ` · anchor set` : "";
    lines.push(`- slug:${g.slug} — ${g.title}${dl}${anchor}`);
  }
  lines.push("");

  lines.push("## Active NEW ME rules (priority asc — lower number = read first)");
  for (const r of rules) {
    lines.push(`- (id:${r.id}) [p${r.priority}] ${r.rule_text}`);
  }
  lines.push("");

  const done = tasks.filter((t) => t.status === "done").length;
  const missed = tasks.filter((t) => t.status === "missed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  lines.push(`## Task execution · last 7 days (${done} done / ${missed} missed / ${pending} pending)`);

  const planById = new Map(plans.map((p) => [p.id, p] as const));
  const tasksByPlanDate = new Map<string, Task[]>();
  for (const t of tasks) {
    const p = planById.get(t.daily_plan_id);
    const key = p?.plan_date ?? "unknown";
    if (!tasksByPlanDate.has(key)) tasksByPlanDate.set(key, []);
    tasksByPlanDate.get(key)!.push(t);
  }
  const goalById = new Map(goals.map((g) => [g.id, g] as const));
  const sortedDates = Array.from(tasksByPlanDate.keys()).sort();
  for (const d of sortedDates) {
    lines.push(`### ${d}`);
    for (const t of tasksByPlanDate.get(d)!) {
      const slug = t.macro_goal_id ? (goalById.get(t.macro_goal_id)?.slug ?? "—") : "—";
      lines.push(`- [${t.status}] (${slug}) (id:${t.id}) ${t.task_name}${t.source === "cursor" ? " · via cursor" : ""}`);
    }
    lines.push("");
  }

  lines.push("## Pointed journal · last 7 days (immutable raw logs)");
  if (journal.length === 0) lines.push("- (no entries — ask user if they skipped Fix-Not-Fixate)");
  for (const j of journal) {
    lines.push(`### ${j.created_at.slice(0, 16).replace("T", " ")} (id:${j.id})`);
    lines.push(`- trigger: ${j.trigger_event}`);
    if (j.automatic_thought) lines.push(`- automatic thought: ${j.automatic_thought}`);
    if (typeof j.emotional_impact === "number")
      lines.push(`- emotional impact: ${j.emotional_impact}%`);
    if (j.identified_schema) lines.push(`- schema: ${j.identified_schema}`);
    lines.push(`- repair: ${j.system_repair}`);
    if (j.long_term_damage) lines.push(`- long-term damage: ${j.long_term_damage}`);
    lines.push(`- resolved: ${j.is_resolved}`);
    lines.push("");
  }

  if (runs.length > 0) {
    lines.push("## Prior analysis runs · last 7 days (your past outputs — do not contradict without new evidence)");
    for (const r of runs) {
      const citedJ = (r.cited_journal_ids ?? []).length;
      const citedT = (r.cited_task_ids ?? []).length;
      lines.push(`### ${r.run_date} (run id:${r.id})`);
      lines.push(`- summary: ${r.summary ?? "(none)"}`);
      lines.push(`- cited ${citedJ} journal / ${citedT} task ids`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/** Full payload for a fresh Cursor chat: product briefing + analyst role + live data. */
export function buildCursorFullPayload(bundle: ContextBundle): string {
  const live = buildCursorContextMarkdown(bundle);
  return [
    PLUSULTRA_APP_BRIEFING,
    "",
    "---",
    "",
    CURSOR_ANALYST_PROMPT,
    "",
    "---",
    "",
    live,
  ].join("\n");
}
