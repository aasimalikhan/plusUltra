export function SuccessRateBadge({
  rate,
  done,
  missed,
  windowDays = 14,
}: {
  rate: number;
  done: number;
  missed: number;
  windowDays?: number;
}) {
  const pct = Math.round(rate * 100);
  const total = done + missed;

  let label = "no data yet";
  let dot = "bg-fg-subtle";
  if (total > 0) {
    if (pct >= 70) {
      label = "system healthy";
      dot = "bg-emerald-500";
    } else if (pct >= 40) {
      label = "system mutating";
      dot = "bg-amber-500";
    } else {
      label = "system nascent — 80% failure is expected at the start";
      dot = "bg-red-500";
    }
  }

  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="section-label">
          {windowDays}-day system success rate
        </p>
        <p className="mt-1 text-3xl font-medium leading-none text-fg">
          {total === 0 ? "—" : `${pct}%`}
        </p>
      </div>
      <div className="text-right text-xs text-fg-muted">
        <p className="font-mono text-fg">
          {done} done · {missed} missed
        </p>
        <p className="mt-1 flex items-center justify-end gap-2 text-[11px] italic text-fg-muted">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </p>
      </div>
    </div>
  );
}
