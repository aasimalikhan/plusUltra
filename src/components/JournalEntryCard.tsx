import Link from "next/link";
import type { PointedJournal } from "@/lib/db-types";

export function JournalEntryCard({ entry }: { entry: PointedJournal }) {
  const date = entry.created_at.slice(0, 10);
  const time = entry.created_at.slice(11, 16);

  return (
    <li className="rounded-md border border-bg-border bg-bg-subtle p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/history/${date}`}
          className="font-mono text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          {date} · {time}
        </Link>
        <span
          className={
            entry.is_resolved
              ? "pill border-emerald-500/30 text-emerald-300"
              : "pill border-amber-500/30 text-amber-300"
          }
        >
          {entry.is_resolved ? "resolved" : "open"}
        </span>
      </div>
      <p className="mt-2 text-fg">
        <span className="text-fg-subtle">Trigger:</span> {entry.trigger_event}
      </p>
      {entry.automatic_thought && (
        <p className="mt-1 text-fg-muted">
          <span className="text-fg-subtle">Thought:</span> {entry.automatic_thought}
        </p>
      )}
      <p className="mt-1 text-fg-muted">
        <span className="text-fg-subtle">Repair:</span> {entry.system_repair}
      </p>
      {entry.long_term_damage && (
        <p className="mt-1 text-fg-muted">
          <span className="text-fg-subtle">Damage:</span> {entry.long_term_damage}
        </p>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-wider text-fg-subtle">
        impact {entry.emotional_impact ?? "—"}% · id {entry.id.slice(0, 8)}…
      </p>
    </li>
  );
}
