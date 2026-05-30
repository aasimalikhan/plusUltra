import type { MacroGoal } from "@/lib/db-types";
import { macroGoalPillClass } from "@/lib/macro-goal-ui";

function daysUntil(d: string | null): string | null {
  if (!d) return null;
  const target = new Date(d + "T00:00:00");
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return `today`;
  return `${days}d`;
}

export function VisualAnchorWall({ goals }: { goals: MacroGoal[] }) {
  return (
    <section
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      style={
        goals.length > 3
          ? { gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))" }
          : undefined
      }
    >
      {goals.map((g) => {
        const dl = daysUntil(g.deadline);
        return (
          <div
            key={g.id}
            className="card relative flex h-32 flex-col justify-between overflow-hidden p-4"
          >
            {g.visual_anchor_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.visual_anchor_url}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
              />
            )}
            <div className="relative">
              <span className={macroGoalPillClass(g.slug)}>{g.slug}</span>
            </div>
            <div className="relative">
              <h3 className="text-sm font-medium leading-tight tracking-tight text-fg">
                {g.title}
              </h3>
              {dl && (
                <p className="mt-1 text-[10px] uppercase tracking-wider text-fg-muted">
                  Deadline · {dl}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
