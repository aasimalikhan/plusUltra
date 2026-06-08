import type { MacroGoal, Task } from "@/lib/db-types";
import { TaskRow } from "./TaskRow";
import { AddTaskInline } from "./AddTaskInline";
import Link from "next/link";

export function WorkSection({
  workTasks,
  richGoal,
  untaggedCandidates,
  workContext,
}: {
  workTasks: Task[];
  richGoal: MacroGoal | undefined;
  /** Personal RICH tasks that might be Verizon work — offer one-click tag */
  untaggedCandidates: Task[];
  workContext: string | null;
}) {
  const done = workTasks.filter((t) => t.status === "done").length;

  return (
    <section className="card border-blue-500/25 bg-blue-500/[0.02]">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="section-label text-blue-300/90">Verizon · work</p>
          <h2 className="h2 mt-0.5">Today&apos;s work execution</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Separate from personal standards (gym, DSA, journal). Work misses don&apos;t
            trigger repair journaling.
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs text-fg-subtle">
          {done}/{workTasks.length}
        </span>
      </header>

      {workContext && (
        <details className="mb-3 rounded-md border border-blue-500/20 bg-bg-subtle/60">
          <summary className="cursor-pointer px-3 py-2 text-xs text-fg-muted">
            Work context (feeds analysis)
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-2 text-xs text-fg-muted">
            {workContext}
          </p>
        </details>
      )}

      <div className="space-y-1.5">
        {workTasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
        {workTasks.length === 0 && (
          <p className="px-2 py-2 text-xs italic text-fg-subtle">
            No work tasks tagged yet. Add below, or move existing tasks from RICH.
          </p>
        )}
      </div>

      {untaggedCandidates.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/[0.04] p-3">
          <p className="text-xs text-fg-muted">
            These look like Verizon tasks but aren&apos;t in the work section yet — click{" "}
            <strong className="font-normal text-fg">→ work</strong> to move them:
          </p>
          <ul className="mt-2 space-y-1">
            {untaggedCandidates.map((t) => (
              <li key={t.id}>
                <TaskRow task={t} showWorkPromote />
              </li>
            ))}
          </ul>
        </div>
      )}

      {richGoal && (
        <div className="mt-3">
          <AddTaskInline
            macroGoalId={richGoal.id}
            defaultCategory="work"
            placeholder="Add Verizon / work task…"
          />
        </div>
      )}

      <p className="mt-3 text-[10px] text-fg-subtle">
        Edit persistent context on{" "}
        <Link href="/manage" className="text-fg-muted underline-offset-2 hover:underline">
          /manage
        </Link>
      </p>
    </section>
  );
}
