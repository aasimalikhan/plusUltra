"use client";

import { useTransition } from "react";
import { resolveJournalEntry } from "@/app/actions/journal";
import type { PointedJournal } from "@/lib/db-types";
import { cn } from "@/lib/utils";

export function ResolveJournalRow({ entry }: { entry: PointedJournal }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await resolveJournalEntry(entry.id, !entry.is_resolved);
    });
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border border-bg-border bg-bg-subtle p-3 text-sm",
        pending && "opacity-50",
        entry.is_resolved && "opacity-60",
      )}
    >
      <button
        onClick={toggle}
        aria-label="toggle resolved"
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
          entry.is_resolved
            ? "border-fg bg-fg text-bg"
            : "border-fg-subtle/50 hover:border-fg",
        )}
      >
        {entry.is_resolved && (
          <svg
            viewBox="0 0 16 16"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M3 8l3 3 7-7" />
          </svg>
        )}
      </button>
      <div className="flex-1 space-y-1">
        <p className={cn("text-fg", entry.is_resolved && "line-through")}>
          <span className="font-medium">Trigger:</span> {entry.trigger_event}
        </p>
        <p className="text-fg-muted">
          <span className="text-fg-subtle">Repair:</span> {entry.system_repair}
        </p>
        {typeof entry.emotional_impact === "number" && (
          <p className="text-[10px] uppercase tracking-wider text-fg-subtle">
            Emotional impact: {entry.emotional_impact}%
          </p>
        )}
      </div>
    </li>
  );
}
