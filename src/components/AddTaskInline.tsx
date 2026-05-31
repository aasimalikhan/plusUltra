"use client";

import { useRef, useState, useTransition } from "react";
import { addTaskToToday } from "@/app/actions/tasks";

export function AddTaskInline({ macroGoalId }: { macroGoalId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("macro_goal_id", macroGoalId);
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
      <input
        name="task_name"
        placeholder="Add a task to this pillar…"
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
