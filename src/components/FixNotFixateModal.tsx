"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { logPointedJournal } from "@/app/actions/journal";

export interface MissedTaskLite {
  id: string;
  task_name: string;
  plan_date?: string;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (missed.length === 0 || idx >= missed.length) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [missed.length, idx]);

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
    const automatic_thought =
      String(fd.get("automatic_thought") ?? "").trim() || undefined;
    const emotional_impact = Number(fd.get("emotional_impact") ?? 0);
    const system_repair = String(fd.get("system_repair") ?? "").trim();
    const long_term_damage =
      String(fd.get("long_term_damage") ?? "").trim() || undefined;

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

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fix-not-fixate-title"
    >
      <div className="card flex max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden p-0 sm:rounded-lg">
        <div className="shrink-0 border-b border-bg-border bg-bg-subtle px-5 py-4">
          <p className="section-label">
            Fix — not fixate · {idx + 1} of {missed.length}
          </p>
          <h3
            id="fix-not-fixate-title"
            className="mt-1 text-base font-medium text-fg"
          >
            {current.task_name}
          </h3>
          {"plan_date" in current && current.plan_date ? (
            <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
              from {current.plan_date}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-fg-muted">
            It is okay. We do not blame. Acknowledge the damage, write the linear
            repair, move on.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
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
              <label className="label">
                Long-term damage if I ignore this (optional)
              </label>
              <input
                name="long_term_damage"
                className="input mt-1"
                placeholder="e.g. compounds into another lost week"
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-bg-border bg-bg px-5 py-4">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary flex-1"
              >
                {pending ? "Saving…" : "Log & next"}
              </button>
              <button type="button" onClick={skip} className="btn">
                Skip
              </button>
            </div>
            {skipped.length > 0 && (
              <p className="mt-2 text-[10px] text-fg-subtle">
                {skipped.length} skipped (logged as missed only)
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
