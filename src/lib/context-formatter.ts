import {
  ATTACK_MODE_ANALYST_FRAMEWORK,
  PLUSULTRA_APP_OPS,
  CURSOR_ANALYST_PROMPT,
  GEMINI_PRO_ANALYST_PROMPT,
} from "@/lib/analyst-framework";
import {
  buildExecutionSummaryBlock,
  buildRecurringMissesBlock,
  buildTaskExecutionBlock,
} from "@/lib/context-stats";
import { formatWorkContextForAnalysis, type WorkContextBundle } from "@/lib/work-context";
import type {
  AnalysisRun,
  DailyPlan,
  DayCapture,
  DeadlineGoalWithMilestones,
  MacroGoal,
  PointedJournal,
  Rule,
  Task,
} from "@/lib/db-types";
import {
  daysUntilDate,
  formatDaysUntil,
  importanceLabel,
  milestoneProgress,
} from "@/lib/deadline-utils";

export interface ContextBundle {
  plans: DailyPlan[];
  tasks: Task[];
  journal: PointedJournal[];
  rules: Rule[];
  goals: MacroGoal[];
  runs: AnalysisRun[];
  deadlines: DeadlineGoalWithMilestones[];
  deadlineHistory?: DeadlineGoalWithMilestones[];
  workContext?: WorkContextBundle | null;
  templates?: Array<{ task_name: string; category: string; is_active: boolean }>;
  captures?: DayCapture[];
}

// Re-export prompts from analyst-framework so callers can import from here.
export { CURSOR_ANALYST_PROMPT, GEMINI_PRO_ANALYST_PROMPT };

export function buildCursorContextMarkdown(bundle: ContextBundle): string {
  const {
    plans,
    tasks,
    journal,
    rules,
    goals,
    runs,
    deadlines,
    deadlineHistory,
    workContext,
    templates,
    captures,
  } = bundle;

  const lines: string[] = [];
  lines.push(`# LIVE DATA · generated ${new Date().toISOString()}`);
  lines.push(
    `Plans in window: ${plans.length} · Tasks: ${tasks.length} · Journal entries: ${journal.length} · Prior runs: ${runs.length} · Active deadlines: ${deadlines.length} · Day captures: ${captures?.length ?? 0}`,
  );
  lines.push("");

  lines.push(...buildExecutionSummaryBlock(tasks, plans, goals));
  lines.push(...buildRecurringMissesBlock(tasks, goals));

  lines.push(
    ...formatWorkContextForAnalysis(
      workContext ?? { verizon: null, freelance: null, legacy: null },
    ),
  );

  if ((captures ?? []).length > 0) {
    lines.push("## Day captures · raw notes for tonight (cleared after analysis applies)");
    for (const c of captures!) {
      lines.push(
        `- (id:${c.id}) ${c.created_at.slice(0, 16).replace("T", " ")} — ${c.content}`,
      );
    }
    lines.push("");
  }

  lines.push("## Standard daily tasks (auto-rolled each morning from /manage templates)");
  const activeTemplates = (templates ?? []).filter((t) => t.is_active);
  if (activeTemplates.length === 0) {
    lines.push("- (none configured — user should set on /manage)");
  } else {
    for (const t of activeTemplates) {
      lines.push(`- [${t.category}] ${t.task_name}`);
    }
  }
  lines.push("");

  lines.push("## Deadline goals · V.IMP (deadlines are God — prioritize tomorrow toward these)");
  if (deadlines.length === 0) {
    lines.push("- (none active — user should add on /deadlines)");
  } else {
    const goalById = new Map(goals.map((g) => [g.id, g] as const));
    for (const d of deadlines) {
      const days = daysUntilDate(d.target_date);
      const countdown = formatDaysUntil(d.target_date) ?? "?";
      const progress = milestoneProgress(d.milestones);
      const pillar = d.macro_goal_id
        ? (goalById.get(d.macro_goal_id)?.slug ?? "—")
        : "—";
      const overdue = days !== null && days < 0 ? " · OVERDUE" : "";
      lines.push(
        `- (id:${d.id}) **${d.title}** · ${d.target_date} (${countdown})${overdue} · importance ${d.importance}/5 (${importanceLabel(d.importance)}) · pillar ${pillar} · progress ${progress}% (${d.milestones.filter((m) => m.is_done).length}/${d.milestones.length} milestones)`,
      );
      if (d.implementation_notes) {
        lines.push(`  - implementation: ${d.implementation_notes}`);
      }
      for (const m of d.milestones) {
        lines.push(
          `  - [${m.is_done ? "done" : "pending"}] (milestone id:${m.id}) ${m.title}${m.target_date ? ` · by ${m.target_date}` : ""}`,
        );
      }
    }
  }
  lines.push("");

  const history = deadlineHistory ?? [];
  if (history.length > 0) {
    lines.push("## Deadline history · completed / paused (context only — do not re-prioritize unless user reactivates)");
    const goalById = new Map(goals.map((g) => [g.id, g] as const));
    for (const d of history) {
      const pillar = d.macro_goal_id
        ? (goalById.get(d.macro_goal_id)?.slug ?? "—")
        : "—";
      lines.push(
        `- (id:${d.id}) **${d.title}** · ${d.status} · target ${d.target_date} · pillar ${pillar}${d.completed_at ? ` · completed ${d.completed_at.slice(0, 10)}` : ""}`,
      );
    }
    lines.push("");
  }

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

  lines.push(...buildTaskExecutionBlock(tasks, plans, goals));

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

/** Full payload for a fresh analysis chat: product briefing + analyst role + live data. */
export function buildCursorFullPayload(
  bundle: ContextBundle,
  providerNote?: string,
): string {
  const live = buildCursorContextMarkdown(bundle);
  const prompt = providerNote
    ? `${CURSOR_ANALYST_PROMPT}\n\nProvider note: ${providerNote}`
    : CURSOR_ANALYST_PROMPT;
  return [
    ATTACK_MODE_ANALYST_FRAMEWORK,
    "",
    "---",
    "",
    PLUSULTRA_APP_OPS,
    "",
    "---",
    "",
    prompt,
    "",
    "---",
    "",
    live,
  ].join("\n");
}

/**
 * Full payload for Gemini 2.5 Pro: same structure as buildCursorFullPayload but
 * uses GEMINI_PRO_ANALYST_PROMPT (6-phase reasoning protocol + task budget calibration
 * + article/capture understanding). Pass this to callGeminiAnalysis when the primary
 * model is a thinking-capable Pro variant.
 */
export function buildGeminiProPayload(bundle: ContextBundle): string {
  const live = buildCursorContextMarkdown(bundle);
  return [
    ATTACK_MODE_ANALYST_FRAMEWORK,
    "",
    "---",
    "",
    PLUSULTRA_APP_OPS,
    "",
    "---",
    "",
    GEMINI_PRO_ANALYST_PROMPT,
    "",
    "---",
    "",
    live,
  ].join("\n");
}

export interface ContextSummary {
  plans: number;
  tasks: number;
  journal: number;
  rules: number;
  goals: number;
  runs: number;
  deadlines: number;
  deadlineHistory: number;
  captures: number;
  templates: number;
  hasWorkContext: boolean;
}

export function buildContextSummary(bundle: ContextBundle): ContextSummary {
  return {
    plans: bundle.plans.length,
    tasks: bundle.tasks.length,
    journal: bundle.journal.length,
    rules: bundle.rules.length,
    goals: bundle.goals.length,
    runs: bundle.runs.length,
    deadlines: bundle.deadlines.length,
    deadlineHistory: bundle.deadlineHistory?.length ?? 0,
    captures: bundle.captures?.length ?? 0,
    templates: (bundle.templates ?? []).filter((t) => t.is_active).length,
    hasWorkContext:
      !!bundle.workContext?.verizon?.trim() ||
      !!bundle.workContext?.freelance?.trim(),
  };
}
