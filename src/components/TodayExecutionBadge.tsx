import type { TodayExecution } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function TodayExecutionBadge({
  today,
  planLocked,
  isEvening,
  variant = "personal",
}: {
  today: TodayExecution;
  planLocked: boolean;
  isEvening: boolean;
  variant?: "personal" | "work";
}) {
  const total = today.done + today.pending + today.missed;
  if (total === 0) return null;

  const pct =
    today.done + today.missed > 0
      ? Math.round((today.done / (today.done + today.missed)) * 100)
      : null;

  const isWork = variant === "work";

  return (
    <div
      className={`card flex items-center justify-between ${
        isWork ? "border-blue-500/20 bg-blue-500/[0.02]" : ""
      }`}
    >
      <div>
        <p className={`section-label ${isWork ? "text-blue-300/90" : ""}`}>
          {isWork ? "Today's work" : "Today's execution"}
        </p>
        <p className="mt-1 font-mono text-lg text-fg">
          {today.done} done
          {today.pending > 0 && (
            <span className="text-amber-300"> · {today.pending} open</span>
          )}
          {today.missed > 0 && (
            <span className="text-red-300"> · {today.missed} missed</span>
          )}
        </p>
      </div>
      <div className="text-right text-xs">
        {!planLocked && today.pending > 0 && (
          <p
            className={cn(
              "font-medium",
              isEvening ? "text-red-300" : "text-amber-300",
            )}
          >
            {isEvening
              ? "Open tasks flip to missed on this visit"
              : "Open until 11pm lock"}
          </p>
        )}
        {pct !== null && planLocked && (
          <p className="font-mono text-fg-muted">{pct}% executed</p>
        )}
        <p className="mt-1 italic text-fg-subtle">
          Pending counts as incomplete, not neutral
        </p>
      </div>
    </div>
  );
}
