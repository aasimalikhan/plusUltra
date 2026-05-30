"use client";

import { useRef, useTransition } from "react";
import { addTaskToToday } from "@/app/actions/tasks";

export function AddTaskInline({ macroGoalId }: { macroGoalId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("macro_goal_id", macroGoalId);
    startTransition(async () => {
      await addTaskToToday(fd);
      formRef.current?.reset();
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
    </form>
  );
}
