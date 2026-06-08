"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { logPointedJournal } from "@/app/actions/journal";
import {
  EMOTIONAL_IMPACT_GUIDE,
  emotionalImpactBand,
  repairQualityHint,
} from "@/lib/journal-validation";

export interface MissedTaskLite {
  id: string;
  task_name: string;
  plan_date?: string;
}

export function FixNotFixateModal({
  missed,
  onAllResolved,
  onDismiss,
  mode = "missed",
}: {
  missed: MissedTaskLite[];
  onAllResolved?: () => void;
  /** Close without logging — won't auto-reopen until tomorrow. */
  onDismiss?: () => void;
  /** missed = evening debrief for task misses; adhoc = log trigger anytime */
  mode?: "missed" | "adhoc";
}) {
  const [idx, setIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [repairHint, setRepairHint] = useState<string | null>(null);
  const [impactValue, setImpactValue] = useState(30);

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
  const isAdhoc = mode === "adhoc";

  function next() {
    setRepairHint(null);
    setImpactValue(30);
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
        queue_repair_task: isAdhoc ? false : true,
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
            {isAdhoc ? "Log a trigger" : current.task_name}
          </h3>
          {!isAdhoc && current.plan_date ? (
            <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
              from {current.plan_date}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-fg-muted">
            {isAdhoc
              ? "Capture a pattern in the moment — no tomorrow task queued unless you want one later via analysis."
              : "Acknowledge damage → write one linear repair → it becomes tomorrow's task. No blame."}
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
                placeholder={
                  isAdhoc
                    ? "e.g. scrolled Instagram for 45 min after lunch"
                    : "e.g. opened phone first thing in the morning"
                }
              />
            </div>

            <div>
              <label className="label">Automatic thought (optional)</label>
              <input
                name="automatic_thought"
                className="input mt-1"
                placeholder="e.g. 'I'll do it after one more reel'"
              />
              <p className="mt-1 text-[10px] text-fg-subtle">
                The knee-jerk story your brain told you — not the logical repair.
              </p>
            </div>

            <div>
              <label className="label">
                {EMOTIONAL_IMPACT_GUIDE.label} (0–100)
              </label>
              <input
                name="emotional_impact"
                type="range"
                min={0}
                max={100}
                step={5}
                value={impactValue}
                onChange={(e) => setImpactValue(Number(e.target.value))}
                className="mt-2 w-full"
              />
              <p className="mt-1 text-xs text-fg-muted">
                {impactValue}% — {emotionalImpactBand(impactValue)}
              </p>
              <p className="mt-0.5 text-[10px] text-fg-subtle">
                {EMOTIONAL_IMPACT_GUIDE.hint}
              </p>
            </div>

            <div>
              <label className="label">Linear repair action — tomorrow</label>
              <input
                name="system_repair"
                required
                className="input mt-1"
                placeholder="e.g. Phone on charger outside bedroom; stand up within 2 min of waking"
                onChange={(e) => setRepairHint(repairQualityHint(e.target.value))}
              />
              {repairHint && (
                <p className="mt-1 text-[10px] text-amber-300">{repairHint}</p>
              )}
              {!isAdhoc && (
                <p className="mt-1 text-[10px] text-fg-subtle">
                  This exact text becomes a task on tomorrow&apos;s /today under the
                  same pillar. Make it specific and schedulable.
                </p>
              )}
            </div>

            <div>
              <label className="label">
                Long-term damage if I ignore this (optional)
              </label>
              <input
                name="long_term_damage"
                className="input mt-1"
                placeholder="e.g. compounds into another lost week, job stagnation"
              />
              <p className="mt-1 text-[10px] text-fg-subtle">
                What breaks if this pattern repeats — not self-attack, just honest
                consequence mapping.
              </p>
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
              {!isAdhoc && (
                <button type="button" onClick={skip} className="btn">
                  Skip
                </button>
              )}
              {isAdhoc && (
                <button type="button" onClick={() => onAllResolved?.()} className="btn">
                  Close
                </button>
              )}
            </div>
            {skipped.length > 0 && (
              <p className="mt-2 text-[10px] text-fg-subtle">
                {skipped.length} skipped — still counted as misses without repair log
              </p>
            )}
            {!isAdhoc && onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="mt-3 w-full text-center text-xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
              >
                Later tonight — don&apos;t show again until tomorrow
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
