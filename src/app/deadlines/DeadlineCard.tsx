"use client";

import { useState, useTransition } from "react";
import {
  addDeadlineMilestone,
  deleteDeadlineGoal,
  deleteDeadlineMilestone,
  toggleDeadlineMilestone,
  updateDeadlineGoal,
} from "@/app/actions/deadlines";
import type { DeadlineGoalWithMilestones, MacroGoal } from "@/lib/db-types";
import {
  daysUntilDate,
  formatDaysUntil,
  importanceLabel,
  milestoneProgress,
  urgencyLabel,
} from "@/lib/deadline-utils";
import { macroGoalPillClass } from "@/lib/macro-goal-ui";
import { cn } from "@/lib/utils";

export function DeadlineCard({
  deadline,
  goals,
}: {
  deadline: DeadlineGoalWithMilestones;
  goals: MacroGoal[];
}) {
  const [notes, setNotes] = useState(deadline.implementation_notes ?? "");
  const [newMilestone, setNewMilestone] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const days = daysUntilDate(deadline.target_date);
  const countdown = formatDaysUntil(deadline.target_date);
  const urgency = urgencyLabel(days);
  const progress = milestoneProgress(deadline.milestones);
  const linkedGoal = goals.find((g) => g.id === deadline.macro_goal_id);

  function saveNotes() {
    startTransition(async () => {
      await updateDeadlineGoal(deadline.id, { implementation_notes: notes || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  function setStatus(status: "active" | "completed" | "paused") {
    startTransition(async () => {
      await updateDeadlineGoal(deadline.id, { status });
    });
  }

  function remove() {
    if (!confirm(`Delete deadline "${deadline.title}"?`)) return;
    startTransition(async () => {
      await deleteDeadlineGoal(deadline.id);
    });
  }

  function addMilestone() {
    const title = newMilestone.trim();
    if (!title) return;
    startTransition(async () => {
      await addDeadlineMilestone(deadline.id, title);
      setNewMilestone("");
    });
  }

  function toggleMilestone(id: string, isDone: boolean) {
    startTransition(async () => {
      await toggleDeadlineMilestone(id, isDone);
    });
  }

  function removeMilestone(id: string) {
    startTransition(async () => {
      await deleteDeadlineMilestone(id);
    });
  }

  return (
    <article
      className={cn(
        "card space-y-4",
        urgency === "overdue" && "border-red-500/40",
        urgency === "critical" && "border-amber-500/30",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <UrgencyBadge urgency={urgency} countdown={countdown} />
            <span className="pill">{importanceLabel(deadline.importance)}</span>
            {linkedGoal && (
              <span className={macroGoalPillClass(linkedGoal.slug)}>{linkedGoal.slug}</span>
            )}
            {saved && <span className="text-xs text-emerald-400">saved</span>}
          </div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
            {deadline.title}
          </h2>
          <p className="font-mono text-xs text-fg-subtle">
            Target · {deadline.target_date}
            {deadline.status !== "active" && (
              <span className="ml-2 uppercase tracking-wide">· {deadline.status}</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold tabular-nums text-fg">{progress}%</p>
          <p className="text-[10px] uppercase tracking-wider text-fg-subtle">milestone progress</p>
        </div>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            progress >= 75 ? "bg-emerald-500/80" : progress >= 40 ? "bg-amber-500/70" : "bg-fg/40",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <section className="space-y-2">
        <h3 className="section-label">Milestones · implement progress here</h3>
        {deadline.milestones.length === 0 ? (
          <p className="text-xs italic text-fg-subtle">
            No checkpoints yet — break this deadline into concrete steps.
          </p>
        ) : (
          <ul className="space-y-1">
            {deadline.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-md px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={m.is_done}
                  disabled={pending}
                  onChange={(e) => toggleMilestone(m.id, e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-bg-border accent-fg"
                />
                <span
                  className={cn(
                    "flex-1 text-sm",
                    m.is_done ? "text-fg-subtle line-through" : "text-fg",
                  )}
                >
                  {m.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeMilestone(m.id)}
                  disabled={pending}
                  className="text-[10px] text-fg-subtle hover:text-red-400"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 pt-1">
          <input
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMilestone())}
            placeholder="Add checkpoint…"
            className="input flex-1 text-sm"
          />
          <button
            type="button"
            onClick={addMilestone}
            disabled={pending || !newMilestone.trim()}
            className="btn shrink-0"
          >
            Add
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <label className="section-label">Implementation notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Systematic work toward this deadline — what you do daily/weekly"
          className="input resize-y text-sm"
        />
        <button
          type="button"
          onClick={saveNotes}
          disabled={pending}
          className="btn btn-primary text-sm"
        >
          Save notes
        </button>
      </section>

      <footer className="flex flex-wrap gap-2 border-t border-bg-border pt-3">
        {deadline.status === "active" ? (
          <>
            <button
              type="button"
              onClick={() => setStatus("completed")}
              disabled={pending}
              className="btn text-sm"
            >
              Mark complete
            </button>
            <button
              type="button"
              onClick={() => setStatus("paused")}
              disabled={pending}
              className="btn text-sm text-fg-muted"
            >
              Pause
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setStatus("active")}
            disabled={pending}
            className="btn text-sm"
          >
            Reactivate
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="btn text-sm text-red-400/80 hover:text-red-400"
        >
          Delete
        </button>
      </footer>
    </article>
  );
}

function UrgencyBadge({
  urgency,
  countdown,
}: {
  urgency: ReturnType<typeof urgencyLabel>;
  countdown: string | null;
}) {
  const styles = {
    overdue: "border-red-500/50 bg-red-500/10 text-red-300",
    critical: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    soon: "border-fg/20 bg-bg-subtle text-fg-muted",
    normal: "border-bg-border bg-bg-subtle text-fg-muted",
  };

  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        styles[urgency],
      )}
    >
      {countdown ?? "—"}
    </span>
  );
}
