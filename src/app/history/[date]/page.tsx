import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerDb } from "@/lib/db";
import type { AnalysisRun, MacroGoal, PointedJournal, Task } from "@/lib/db-types";
import { macroGoalPillClass } from "@/lib/macro-goal-ui";

export const dynamic = "force-dynamic";

export default async function HistoryDayPage({ params }: { params: { date: string } }) {
  const { supabase, userId } = await getServerDb();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) notFound();

  const [{ data: plan }, { data: goals }] = await Promise.all([
    supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", params.date)
      .maybeSingle(),
    supabase
      .from("macro_goals")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order"),
  ]);

  if (!plan) {
    return (
      <div className="space-y-5">
        <Link
          href="/history"
          className="text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          ← history
        </Link>
        <p className="text-sm text-fg-muted">No plan for {params.date}.</p>
      </div>
    );
  }

  const [{ data: tasks }, { data: journal }, { data: runs }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("daily_plan_id", plan.id)
      .order("created_at"),
    supabase
      .from("pointed_journal")
      .select("*")
      .eq("user_id", userId)
      .eq("daily_plan_id", plan.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("analysis_runs")
      .select("*")
      .eq("user_id", userId)
      .eq("run_date", params.date)
      .order("created_at", { ascending: false }),
  ]);

  const goalById = new Map((goals ?? []).map((g: MacroGoal) => [g.id, g] as const));

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/history"
          className="text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          ← history
        </Link>
        <h1 className="h1 mt-2 font-mono">{params.date}</h1>
        <p className="section-label mt-1">
          {new Date(params.date + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <section className="card">
        <h2 className="section-label mb-3">Tasks</h2>
        {(tasks ?? []).length === 0 ? (
          <p className="text-xs italic text-fg-subtle">No tasks.</p>
        ) : (
          <ul className="space-y-1.5">
            {(tasks ?? []).map((t: Task) => {
              const g = t.macro_goal_id
                ? goalById.get(t.macro_goal_id)
                : undefined;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-md border border-bg-border bg-bg-subtle px-3 py-1.5 text-sm"
                >
                  <span
                    className={
                      t.status === "done"
                        ? "text-emerald-400"
                        : t.status === "missed"
                          ? "text-red-400"
                          : "text-fg-subtle"
                    }
                  >
                    {t.status === "done"
                      ? "✓"
                      : t.status === "missed"
                        ? "✗"
                        : "·"}
                  </span>
                  {g && (
                    <span className={macroGoalPillClass(g.slug)}>{g.slug}</span>
                  )}
                  <span className="flex-1 text-fg">{t.task_name}</span>
                  {t.source === "cursor" && <span className="pill">cursor</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-label mb-3">Pointed journal</h2>
        {(journal ?? []).length === 0 ? (
          <p className="text-xs italic text-fg-subtle">No journal entries.</p>
        ) : (
          <ul className="space-y-3">
            {(journal ?? []).map((j: PointedJournal) => (
              <li
                key={j.id}
                className="rounded-md border border-bg-border bg-bg-subtle p-3 text-sm"
              >
                <p className="text-fg">
                  <span className="text-fg-subtle">Trigger:</span>{" "}
                  {j.trigger_event}
                </p>
                {j.automatic_thought && (
                  <p className="mt-1 text-fg-muted">
                    <span className="text-fg-subtle">Thought:</span>{" "}
                    {j.automatic_thought}
                  </p>
                )}
                <p className="mt-1 text-fg-muted">
                  <span className="text-fg-subtle">Repair:</span>{" "}
                  {j.system_repair}
                </p>
                {j.long_term_damage && (
                  <p className="mt-1 text-fg-muted">
                    <span className="text-fg-subtle">Long-term damage:</span>{" "}
                    {j.long_term_damage}
                  </p>
                )}
                <p className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle">
                  emotional impact: {j.emotional_impact ?? "—"}% ·{" "}
                  {j.is_resolved ? "resolved" : "open"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-label mb-3">Analysis runs</h2>
        {(runs ?? []).length === 0 ? (
          <p className="text-xs italic text-fg-subtle">No analysis runs.</p>
        ) : (
          <ul className="space-y-3">
            {(runs ?? []).map((r: AnalysisRun) => (
              <li
                key={r.id}
                className="rounded-md border border-bg-border bg-bg-subtle p-3"
              >
                <p className="text-sm text-fg">
                  {r.summary ?? "(no summary)"}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-fg-subtle hover:text-fg">
                    Raw Cursor output
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-sm bg-bg/60 p-2 font-mono text-[10px] text-fg-muted">
                    {JSON.stringify(r.cursor_raw_output, null, 2)}
                  </pre>
                </details>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-fg-subtle hover:text-fg">
                    Raw Cursor input (markdown sent)
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-sm bg-bg/60 p-2 font-mono text-[10px] text-fg-muted">
                    {typeof r.cursor_raw_input === "object" &&
                    r.cursor_raw_input !== null &&
                    "markdown" in
                      (r.cursor_raw_input as Record<string, unknown>)
                      ? String(
                          (r.cursor_raw_input as Record<string, unknown>)
                            .markdown,
                        )
                      : JSON.stringify(r.cursor_raw_input, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
