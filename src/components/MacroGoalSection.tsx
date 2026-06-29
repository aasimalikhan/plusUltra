import type { MacroGoal, Task } from "@/lib/db-types";
import { macroGoalPillClass } from "@/lib/macro-goal-ui";
import { TaskRow } from "./TaskRow";
import { AddTaskInline } from "./AddTaskInline";

function sortByFriction(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => (b.friction_level ?? 1) - (a.friction_level ?? 1),
  );
}

export function MacroGoalSection({
  goal,
  tasks,
}: {
  goal: MacroGoal;
  tasks: Task[];
}) {
  const sorted = sortByFriction(tasks.filter((t) => !t.is_anti_task));
  const done = sorted.filter((t) => t.status === "done").length;
  return (
    <section className="card">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={macroGoalPillClass(goal.slug)}>{goal.slug}</span>
          <h3 className="h2">{goal.title}</h3>
        </div>
        <span className="font-mono text-xs text-fg-subtle">
          {done}/{sorted.length}
        </span>
      </header>
      <div className="space-y-1.5">
        {sorted.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
        {sorted.length === 0 && (
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
