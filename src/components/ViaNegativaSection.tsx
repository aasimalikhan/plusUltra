"use client";

import { useState, useTransition } from "react";
import { setTaskStatus } from "@/app/actions/tasks";
import type { MacroGoal, Task } from "@/lib/db-types";
import { macroGoalPillClass } from "@/lib/macro-goal-ui";
import { cn } from "@/lib/utils";
import { FixNotFixateModal, type MissedTaskLite } from "./FixNotFixateModal";

export function ViaNegativaSection({
  tasks,
  goals,
}: {
  tasks: Task[];
  goals: MacroGoal[];
}) {
  const [modalMissed, setModalMissed] = useState<MissedTaskLite[]>([]);
  const [pending, startTransition] = useTransition();

  if (tasks.length === 0) return null;

  const slugByGoalId = new Map(goals.map((g) => [g.id, g.slug] as const));

  function failHabit(task: Task) {
    if (task.status !== "pending") return;
    startTransition(async () => {
      await setTaskStatus(task.id, "missed");
      setModalMissed([{ id: task.id, task_name: task.task_name }]);
    });
  }

  return (
    <>
      <section className="card border-red-500/35 bg-red-500/[0.05]">
        <header className="mb-3">
          <p className="section-label text-red-300/90">Via Negativa · Do Not Do</p>
          <p className="mt-1 text-xs text-fg-muted">
            Subtractive habits — checking means you <strong className="font-medium text-red-200">failed</strong>{" "}
            the constraint today. Success is leaving these unchecked.
          </p>
        </header>
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const missed = task.status === "missed";
            const slug = task.macro_goal_id
              ? slugByGoalId.get(task.macro_goal_id)
              : undefined;

            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2.5 transition",
                  pending && "opacity-50",
                  missed && "border-red-500/40 bg-red-500/10",
                )}
              >
                <button
                  type="button"
                  aria-label={
                    missed
                      ? "habit failed — logged"
                      : "I failed this habit — mark as missed"
                  }
                  disabled={missed || pending}
                  onClick={() => failHabit(task)}
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border transition-colors",
                    missed
                      ? "border-red-500 bg-red-500/30 text-red-200"
                      : "border-red-400/50 hover:border-red-400 hover:bg-red-500/15",
                  )}
                >
                  {missed && (
                    <span className="text-[10px] font-medium text-red-300">×</span>
                  )}
                </button>

                <span
                  className={cn(
                    "flex-1 text-sm",
                    missed ? "text-red-300 line-through" : "text-fg",
                  )}
                >
                  {task.task_name}
                </span>

                {slug && (
                  <span className={cn(macroGoalPillClass(slug), "opacity-80")}>
                    {slug}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {modalMissed.length > 0 && (
        <FixNotFixateModal
          missed={modalMissed}
          onAllResolved={() => setModalMissed([])}
        />
      )}
    </>
  );
}
