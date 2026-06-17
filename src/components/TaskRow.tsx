"use client";

import { useState, useTransition } from "react";
import { setTaskStatus, deleteTask, renameTask, setTaskWorkClient } from "@/app/actions/tasks";
import type { Task, TaskStatus } from "@/lib/db-types";
import { cn } from "@/lib/utils";

export function TaskRow({
  task,
  showWorkPromote = false,
}: {
  task: Task;
  /** Compact row with prominent → work button */
  showWorkPromote?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(task.task_name);
  const category = task.category ?? "personal";

  function toggle() {
    const next: TaskStatus =
      task.status === "done" ? "pending" : "done";
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

  function saveEdit() {
    const name = editName.trim();
    if (!name || name === task.task_name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await renameTask(task.id, name);
      setEditing(false);
    });
  }

  function promoteToWork(client: "verizon" | "freelance") {
    startTransition(async () => {
      await setTaskWorkClient(task.id, client);
    });
  }

  const done = task.status === "done";
  const missed = task.status === "missed";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-bg-border bg-bg-subtle px-3 py-2.5 transition",
        pending && "opacity-50",
        category === "work" && "border-blue-500/20",
      )}
    >
      <button
        type="button"
        aria-label={
          done ? "mark not done" : missed ? "mark done (was missed)" : "mark done"
        }
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

      {editing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setEditName(task.task_name);
              setEditing(false);
            }
          }}
          autoFocus
          className="input flex-1 py-1 text-sm"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
          className={cn(
            "flex-1 cursor-text text-sm",
            done && "text-fg-subtle line-through",
            missed && "text-red-300",
            !done && !missed && "text-fg",
          )}
        >
          {task.task_name}
        </span>
      )}

      {category === "work" && (
        <span className="pill border-blue-500/30 text-blue-300">
          {task.work_client ?? "verizon"}
        </span>
      )}
      {category === "personal" && showWorkPromote && (
        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => promoteToWork("verizon")}
            className="pill border-blue-500/30 text-blue-300"
          >
            → Verizon
          </button>
          <button
            type="button"
            onClick={() => promoteToWork("freelance")}
            className="pill border-violet-500/30 text-violet-300"
          >
            → Freelance
          </button>
        </span>
      )}

      {task.source === "cursor" && (
        <span className="pill">cursor</span>
      )}
      {task.source === "standard" && (
        <span className="pill">standard</span>
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
