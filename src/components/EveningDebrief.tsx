"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FixNotFixateModal, type MissedTaskLite } from "./FixNotFixateModal";
import type { TodayExecution } from "@/lib/queries";

interface MissedWithDate extends MissedTaskLite {
  plan_date?: string;
}

export function EveningDebrief({
  visible,
  planLocked,
  isEvening,
  today,
  missedNeedingJournal,
  hasAnalysisRun,
  tomorrowTaskCount,
}: {
  visible: boolean;
  planLocked: boolean;
  isEvening: boolean;
  today: TodayExecution;
  missedNeedingJournal: MissedWithDate[];
  hasAnalysisRun: boolean;
  tomorrowTaskCount: number;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const dayClosed = planLocked;
  const journalDone = missedNeedingJournal.length === 0;
  const cursorDone = hasAnalysisRun;
  const debriefComplete = dayClosed && journalDone && cursorDone;

  useEffect(() => {
    if (visible && isEvening && missedNeedingJournal.length > 0) {
      setModalOpen(true);
    }
  }, [visible, isEvening, missedNeedingJournal.length]);

  if (!visible) return null;

  const steps = [
    {
      key: "close",
      label: "Close the day",
      done: dayClosed,
      detail: dayClosed
        ? "Pending tasks marked missed · day locked"
        : today.pending > 0
          ? `${today.pending} still open — auto-miss at 11pm when you visit /today`
          : "All tasks resolved before lock",
    },
    {
      key: "journal",
      label: "Log repairs for misses",
      done: journalDone,
      detail: journalDone
        ? "Every miss has a journal entry"
        : `${missedNeedingJournal.length} miss${missedNeedingJournal.length === 1 ? "" : "es"} without repair log`,
    },
    {
      key: "cursor",
      label: "Run Cursor analysis",
      done: cursorDone,
      detail: cursorDone
        ? "Tonight's run applied — tomorrow's plan mutated"
        : "Copy context → paste JSON back on /cursor",
    },
  ] as const;

  function handleModalDone() {
    setModalOpen(false);
    router.refresh();
  }

  return (
    <>
      <section
        className={cn(
          "card",
          !debriefComplete && "border-amber-500/40 bg-amber-500/[0.03]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-label">Evening debrief</p>
            <p className="mt-1 text-sm text-fg-muted">
              {debriefComplete
                ? "Loop closed. Repairs queued for tomorrow."
                : "Finish all three steps — partial data breaks the system loop."}
            </p>
          </div>
          {tomorrowTaskCount > 0 && (
            <span className="pill shrink-0">{tomorrowTaskCount} tomorrow</span>
          )}
        </div>

        <ol className="mt-4 space-y-2">
          {steps.map((step, i) => (
            <li
              key={step.key}
              className={cn(
                "flex gap-3 rounded-md border px-3 py-2.5 text-sm",
                step.done
                  ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                  : "border-bg-border bg-bg-subtle",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]",
                  step.done
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-bg-border text-fg-subtle",
                )}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={step.done ? "text-fg-muted line-through" : "text-fg"}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-fg-subtle">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          {!journalDone && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn btn-primary"
            >
              Log {missedNeedingJournal.length} repair
              {missedNeedingJournal.length === 1 ? "" : "s"}
            </button>
          )}
          {!cursorDone && (
            <Link href="/cursor" className="btn btn-primary">
              Open Cursor analyst →
            </Link>
          )}
          {debriefComplete && (
            <Link href="/history" className="btn">
              View history →
            </Link>
          )}
        </div>

        {tomorrowTaskCount > 0 && (
          <p className="mt-3 text-xs text-fg-subtle">
            {tomorrowTaskCount} task{tomorrowTaskCount === 1 ? "" : "s"} already
            queued for tomorrow (repairs + Cursor). Shown on tomorrow&apos;s /today.
          </p>
        )}
      </section>

      {modalOpen && missedNeedingJournal.length > 0 && (
        <FixNotFixateModal
          missed={missedNeedingJournal}
          onAllResolved={handleModalDone}
        />
      )}
    </>
  );
}
