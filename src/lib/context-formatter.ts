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

export const CURSOR_ANALYST_PROMPT = `You are my logical-brain analyst running the plusUltra behavioral framework
(neuroplasticity, repair-not-blame, fix-not-fixate, system-over-willpower, growth mindset,
Pareto-aware failure rates, Self-Determination Theory integrated regulation).

Read the context block below: my last 7 days of tasks (done/missed), pointed journal entries
(triggers, automatic thoughts, emotional impact, repair actions, schemas), my active NEW ME
rules, my macro goals with deadlines, and any prior analysis runs.

Your job:
1. Identify failure patterns and recurring triggers across the week. Cite specific journal IDs.
2. Mutate TOMORROW's task list under the three macro pillars (RICH / MUSCULAR / INTELLIGENT).
   Pivot based on data, not theory. "Fix not fixate."
3. Update NEW ME rules. Add new ones for repeated patterns. Demote stale ones (raise their
   priority number; lower number = higher visual rank). Deactivate rules I have clearly
   resolved (referenced by id).
4. Never blame. Never write generic motivational copy. Be linear and specific.

Constraints:
- Return ONLY valid JSON. No prose around it. No markdown fences.
- Schema:
{
  "summary": string,
  "cited_journal_ids": string[],
  "cited_task_ids": string[],
  "tomorrow_tasks": [{ "macro_goal_slug": "RICH" | "MUSCULAR" | "INTELLIGENT", "task_name": string }],
  "rule_changes": {
    "add":        [{ "rule_text": string, "priority"?: number }],
    "demote":     [{ "id": string, "priority": number }],
    "deactivate": string[]
  }
}

CONTEXT BELOW
=============`;

export function buildCursorContextMarkdown(bundle: ContextBundle): string {
  const { plans, tasks, journal, rules, goals, runs } = bundle;

  const lines: string[] = [];
  lines.push(`# plusUltra context · generated ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Macro goals");
  for (const g of goals) {
    const dl = g.deadline ? ` · deadline ${g.deadline}` : "";
    lines.push(`- [${g.slug}] ${g.title}${dl}`);
  }
  lines.push("");

  lines.push("## Active NEW ME rules (priority asc, id in parens)");
  for (const r of rules) {
    lines.push(`- (id:${r.id}) [p${r.priority}] ${r.rule_text}`);
  }
  lines.push("");

  lines.push("## Tasks · last 7 days (grouped by plan_date)");
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
      lines.push(`- [${t.status}] (${slug}) (id:${t.id}) ${t.task_name}`);
    }
    lines.push("");
  }

  lines.push("## Pointed journal · last 7 days");
  if (journal.length === 0) lines.push("- (no entries)");
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
    lines.push("## Prior analysis runs · last 7 days (summary only)");
    for (const r of runs) {
      lines.push(`- ${r.run_date}: ${r.summary ?? "(no summary)"}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
