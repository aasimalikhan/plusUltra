"use client";

import { useRef, useState, useTransition } from "react";
import { addTaskToToday } from "@/app/actions/tasks";
import type { TaskCategory } from "@/lib/db-types";

export function AddTaskInline({
  macroGoalId,
  defaultCategory = "personal",
  placeholder = "Add a task to this pillar…",
}: {
  macroGoalId: string;
  defaultCategory?: TaskCategory;
  placeholder?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("macro_goal_id", macroGoalId);
    fd.set("category", defaultCategory);
    startTransition(async () => {
      try {
        await addTaskToToday(fd);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add task");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex gap-2">
      <input type="hidden" name="category" value={defaultCategory} />
      <input
        name="task_name"
        placeholder={placeholder}
        className="input flex-1 text-sm"
        required
        disabled={pending}
      />
      <button type="submit" disabled={pending} className="btn text-xs">
        Add
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </form>
  );
}
