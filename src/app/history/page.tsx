import Link from "next/link";
import { getServerDb } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface DayCell {
  date: string;
  total: number;
  done: number;
  missed: number;
}

export default async function HistoryPage() {
  const { supabase, userId } = await getServerDb();
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceISO = since.toISOString();

  const { data: plans } = await supabase
    .from("daily_plans")
    .select("plan_date, id, tasks(status)")
    .eq("user_id", userId)
    .gte("plan_date", since.toISOString().slice(0, 10))
    .order("plan_date", { ascending: false });

  const { data: runs } = await supabase
    .from("analysis_runs")
    .select("run_date, id")
    .eq("user_id", userId)
    .gte("created_at", sinceISO)
    .order("run_date", { ascending: false });

  const runsByDate = new Map<string, number>();
  for (const r of runs ?? []) {
    runsByDate.set(r.run_date, (runsByDate.get(r.run_date) ?? 0) + 1);
  }

  const cells: DayCell[] = (plans ?? []).map((p) => {
    const tasks = (p.tasks ?? []) as { status: string }[];
    return {
      date: p.plan_date as string,
      total: tasks.length,
      done: tasks.filter((t) => t.status === "done").length,
      missed: tasks.filter((t) => t.status === "missed").length,
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Archive</p>
        <h1 className="h1 mt-1">History</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Last 60 days. Click a date for that day&apos;s tasks + journal + runs. Or browse{" "}
          <Link href="/journal" className="text-fg underline-offset-2 hover:underline">
            all journal
          </Link>{" "}
          /{" "}
          <Link href="/insights" className="text-fg underline-offset-2 hover:underline">
            all analysis runs
          </Link>
          .
        </p>
      </div>

      <section className="card">
        {cells.length === 0 ? (
          <p className="text-xs italic text-fg-subtle">No plans yet.</p>
        ) : (
          <ul className="divide-y divide-bg-border">
            {cells.map((c) => {
              const rate =
                c.total > 0
                  ? Math.round(
                      (c.done / Math.max(c.done + c.missed, 1)) * 100,
                    )
                  : null;
              const runCount = runsByDate.get(c.date) ?? 0;
              return (
                <li key={c.date}>
                  <Link
                    href={`/history/${c.date}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-bg-subtle/40"
                  >
                    <div>
                      <p className="font-mono text-sm text-fg">{c.date}</p>
                      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">
                        {new Date(c.date + "T00:00:00").toLocaleDateString(
                          undefined,
                          { weekday: "long" },
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-fg-muted">
                        {c.done}/{c.total}
                      </span>
                      {c.missed > 0 && (
                        <span className="font-mono text-red-400">
                          −{c.missed}
                        </span>
                      )}
                      {rate !== null && (
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 font-mono text-[10px]",
                            rate >= 70 &&
                              "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300",
                            rate >= 40 &&
                              rate < 70 &&
                              "border-amber-500/30 bg-amber-500/[0.06] text-amber-300",
                            rate < 40 &&
                              "border-red-500/30 bg-red-500/[0.06] text-red-300",
                          )}
                        >
                          {rate}%
                        </span>
                      )}
                      {runCount > 0 && <span className="pill">{runCount} run</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
