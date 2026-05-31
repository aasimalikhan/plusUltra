import Link from "next/link";
import type { DeadlineGoalWithMilestones } from "@/lib/db-types";
import {
  formatDaysUntil,
  importanceLabel,
  milestoneProgress,
  urgencyLabel,
  daysUntilDate,
} from "@/lib/deadline-utils";
import { cn } from "@/lib/utils";

export function DeadlineStrip({ deadlines }: { deadlines: DeadlineGoalWithMilestones[] }) {
  const top = deadlines.slice(0, 4);
  if (top.length === 0) return null;

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-label">Deadlines · V.IMP</h2>
        <Link
          href="/deadlines"
          className="text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Manage all →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {top.map((d) => {
          const days = daysUntilDate(d.target_date);
          const urgency = urgencyLabel(days);
          const progress = milestoneProgress(d.milestones);
          return (
            <li
              key={d.id}
              className={cn(
                "rounded-md border border-bg-border bg-bg/40 px-3 py-2.5",
                urgency === "overdue" && "border-red-500/30",
                urgency === "critical" && "border-amber-500/25",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight text-fg">{d.title}</p>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-fg-subtle">
                  {formatDaysUntil(d.target_date)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className="h-full rounded-full bg-fg/50"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-fg-subtle">{progress}%</span>
              </div>
              <p className="mt-1 text-[10px] text-fg-subtle">
                {importanceLabel(d.importance)} · {d.milestones.filter((m) => m.is_done).length}/
                {d.milestones.length} milestones
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
