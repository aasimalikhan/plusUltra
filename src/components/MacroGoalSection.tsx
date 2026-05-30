import type { MacroGoal, Task } from "@/lib/db-types";
import { TaskRow } from "./TaskRow";
import { AddTaskInline } from "./AddTaskInline";

const PILL: Record<string, string> = {
  RICH: "pill pill-rich",
  MUSCULAR: "pill pill-muscular",
  INTELLIGENT: "pill pill-intelligent",
};

export function MacroGoalSection({ goal, tasks }: { goal: MacroGoal; tasks: Task[] }) {
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <section className="card">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={PILL[goal.slug] ?? "pill"}>{goal.slug}</span>
          <h3 className="h2">{goal.title}</h3>
        </div>
        <span className="font-mono text-xs text-fg-subtle">
          {done}/{tasks.length}
        </span>
      </header>
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-1 text-xs italic text-fg-subtle">
            No tasks for this pillar yet.
          </p>
        )}
      </div>
      <div className="mt-3">
        <AddTaskInline macroGoalId={goal.id} />
      </div>
    </section>
  );
}
