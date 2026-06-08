export function SuccessRateBadge({
  rate,
  done,
  missed,
  pending = 0,
  windowDays = 14,
  label = "system",
}: {
  rate: number;
  done: number;
  missed: number;
  pending?: number;
  windowDays?: number;
  /** "system" = personal pillars; "work" = Verizon */
  label?: "system" | "work";
}) {
  const pct = Math.round(rate * 100);
  const total = done + missed;

  let statusLabel = "no data yet";
  let dot = "bg-fg-subtle";
  if (total > 0) {
    if (pct >= 70) {
      statusLabel = label === "work" ? "work on track" : "system healthy";
      dot = "bg-emerald-500";
    } else if (pct >= 40) {
      statusLabel = label === "work" ? "work mutating" : "system mutating";
      dot = "bg-amber-500";
    } else {
      statusLabel =
        label === "work"
          ? "work backlog heavy"
          : "system nascent — 80% failure is expected at the start";
      dot = "bg-red-500";
    }
  }

  const title =
    label === "work"
      ? `${windowDays}-day work success rate`
      : `${windowDays}-day system success rate`;

  return (
    <div
      className={`card flex items-center justify-between ${
        label === "work" ? "border-blue-500/20 bg-blue-500/[0.02]" : ""
      }`}
    >
      <div>
        <p className={`section-label ${label === "work" ? "text-blue-300/90" : ""}`}>
          {title}
        </p>
        <p className="mt-1 text-3xl font-medium leading-none text-fg">
          {total === 0 ? "—" : `${pct}%`}
        </p>
      </div>
      <div className="text-right text-xs text-fg-muted">
        <p className="font-mono text-fg">
          {done} done · {missed} missed
          {pending > 0 && (
            <span className="text-amber-300/90"> · {pending} still open</span>
          )}
        </p>
        <p className="mt-0.5 text-[10px] text-fg-subtle">
          Rate uses done ÷ (done + missed) — open tasks excluded until locked
        </p>
        <p className="mt-1 flex items-center justify-end gap-2 text-[11px] italic text-fg-muted">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
          {statusLabel}
        </p>
      </div>
    </div>
  );
}