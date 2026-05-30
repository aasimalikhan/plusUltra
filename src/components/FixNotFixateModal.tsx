"use client";

import { useState, useTransition } from "react";
import { logPointedJournal } from "@/app/actions/journal";

export interface MissedTaskLite {
  id: string;
  task_name: string;
}

export function FixNotFixateModal({
  missed,
  onAllResolved,
}: {
  missed: MissedTaskLite[];
  onAllResolved?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [skipped, setSkipped] = useState<string[]>([]);

  if (missed.length === 0) return null;
  if (idx >= missed.length) {
    onAllResolved?.();
    return null;
  }

  const current = missed[idx];

  function next() {
    setIdx((i) => i + 1);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const trigger_event = String(fd.get("trigger_event") ?? "").trim();
    const automatic_thought = String(fd.get("automatic_thought") ?? "").trim() || undefined;
    const emotional_impact = Number(fd.get("emotional_impact") ?? 0);
    const system_repair = String(fd.get("system_repair") ?? "").trim();
    const long_term_damage = String(fd.get("long_term_damage") ?? "").trim() || undefined;

    if (!trigger_event || !system_repair) return;

    const isRealTask = !current.id.startsWith("__");
    startTransition(async () => {
      await logPointedJournal({
        related_task_id: isRealTask ? current.id : null,
        trigger_event,
        automatic_thought,
        emotional_impact,
        system_repair,
        long_term_damage,
      });
      next();
    });
  }

  function skip() {
    setSkipped((s) => [...s, current.id]);
    next();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="card w-full max-w-lg overflow-hidden p-0 sm:rounded-lg">
        <div className="border-b border-bg-border bg-bg-subtle px-5 py-3">
          <p className="section-label">
            Fix — not fixate · {idx + 1} of {missed.length}
          </p>
          <h3 className="mt-1 text-base font-medium text-fg">
            {current.task_name}
          </h3>
          <p className="mt-1 text-xs text-fg-muted">
            It is okay. We do not blame. Acknowledge the damage, write the linear
            repair, move on.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <div>
            <label className="label">Trigger — what set this off?</label>
            <input
              name="trigger_event"
              required
              className="input mt-1"
              placeholder="e.g. opened phone first thing in the morning"
            />
          </div>

          <div>
            <label className="label">Automatic thought (optional)</label>
            <input
              name="automatic_thought"
              className="input mt-1"
              placeholder="e.g. 'I'll do it after one more reel'"
            />
          </div>

          <div>
            <label className="label">Emotional impact (0–100)</label>
            <input
              name="emotional_impact"
              type="number"
              min={0}
              max={100}
              defaultValue={30}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="label">Linear repair action — tomorrow</label>
            <input
              name="system_repair"
              required
              className="input mt-1"
              placeholder="e.g. phone outside the room overnight"
            />
          </div>

          <div>
            <label className="label">Long-term damage if I ignore this (optional)</label>
            <input
              name="long_term_damage"
              className="input mt-1"
              placeholder="e.g. compounds into another lost week"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={pending} className="btn btn-primary flex-1">
              {pending ? "Saving…" : "Log & next"}
            </button>
            <button type="button" onClick={skip} className="btn">
              Skip
            </button>
          </div>
          {skipped.length > 0 && (
            <p className="text-[10px] text-fg-subtle">
              {skipped.length} skipped (logged as missed only)
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
