"use client";

import { useTransition } from "react";
import { setTaskStatus, deleteTask } from "@/app/actions/tasks";
import type { Task, TaskStatus } from "@/lib/db-types";
import { cn } from "@/lib/utils";

export function TaskRow({ task }: { task: Task }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next: TaskStatus = task.status === "done" ? "pending" : "done";
    startTransition(async () => {
      await setTaskStatus(task.id, next);
    });
  }

  function remove() {
    if (!confirm("Delete this task?")) return;
    startTransition(async () => {
      await deleteTask(task.id);
    });
  }

  const done = task.status === "done";
  const missed = task.status === "missed";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-bg-border bg-bg-subtle px-3 py-2.5 transition",
        pending && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label={done ? "mark not done" : "mark done"}
        onClick={toggle}
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border transition-colors",
          done
            ? "border-fg bg-fg text-bg"
            : missed
              ? "border-red-500/60 bg-red-500/10"
              : "border-fg-subtle/50 hover:border-fg",
        )}
      >
        {done && (
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M3 8l3 3 7-7" />
          </svg>
        )}
        {missed && (
          <span className="text-[10px] font-medium text-red-400">×</span>
        )}
      </button>

      <span
        className={cn(
          "flex-1 text-sm",
          done && "text-fg-subtle line-through",
          missed && "text-red-300",
          !done && !missed && "text-fg",
        )}
      >
        {task.task_name}
      </span>

      {task.source === "cursor" && (
        <span className="pill">cursor</span>
      )}

      <button
        type="button"
        onClick={remove}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="delete task"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4 text-fg-subtle hover:text-red-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4h10M6.5 7v5M9.5 7v5M5 4l.5-2h5l.5 2M4 4l1 10h6l1-10" />
        </svg>
      </button>
    </div>
  );
}
