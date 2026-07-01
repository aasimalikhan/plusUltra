import type { MacroGoal, Task } from "@/lib/db-types";
import {
  resolveWorkClient,
  type WorkContextBundle,
  workClientLabel,
} from "@/lib/work-context";
import { TaskRow } from "./TaskRow";
import { AddTaskInline } from "./AddTaskInline";
import Link from "next/link";

function WorkClientBlock({
  client,
  tasks,
  context,
  richGoal,
}: {
  client: "verizon" | "freelance";
  tasks: Task[];
  context: string | null;
  richGoal: MacroGoal | undefined;
}) {
  const done = tasks.filter((t) => t.status === "done").length;
  const label = workClientLabel(client);
  const accent =
    client === "verizon"
      ? "border-blue-500/25 bg-blue-500/[0.02]"
      : "border-violet-500/25 bg-violet-500/[0.02]";

  return (
    <div className={`rounded-md border p-3 ${accent}`}>
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-fg">{label}</p>
          <p className="font-mono text-[10px] text-fg-subtle">
            {done}/{tasks.length} today
          </p>
        </div>
      </header>

      {context && (
        <details className="mb-2 rounded-md border border-bg-border bg-bg-subtle/60">
          <summary className="cursor-pointer px-2 py-1.5 text-[10px] text-fg-muted">
            Context (feeds analysis)
          </summary>
          <p className="whitespace-pre-wrap px-2 pb-2 text-[10px] text-fg-muted">
            {context}
          </p>
        </details>
      )}

      <div className="space-y-1">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <p className="text-[10px] italic text-fg-subtle">No {label} tasks today.</p>
        )}
      </div>

      {richGoal && (
        <div className="mt-2">
          <AddTaskInline
            macroGoalId={richGoal.id}
            defaultCategory="work"
            workClient={client}
            placeholder={`Add ${label} task…`}
          />
        </div>
      )}
    </div>
  );
}

export function WorkSection({
  workTasks,
  richGoal,
  untaggedCandidates,
  workContexts,
}: {
  workTasks: Task[];
  richGoal: MacroGoal | undefined;
  untaggedCandidates: Task[];
  workContexts: WorkContextBundle;
}) {
  const verizonTasks = workTasks.filter((t) => resolveWorkClient(t) === "verizon");
  const freelanceTasks = workTasks.filter((t) => resolveWorkClient(t) === "freelance");
  const done = workTasks.filter((t) => t.status === "done").length;

  return (
    <section className="card border-blue-500/20 bg-blue-500/[0.015] transition">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="section-label text-blue-300/90">Work · Verizon + freelance</p>
          <h2 className="h2 mt-0.5">Today&apos;s work execution</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Separate from personal standards. Work misses don&apos;t trigger repair journaling.
            Tag Verizon employer work vs freelance client work.
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs text-fg-subtle">
          {done}/{workTasks.length}
        </span>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <WorkClientBlock
          client="verizon"
          tasks={verizonTasks}
          context={workContexts.verizon}
          richGoal={richGoal}
        />
        <WorkClientBlock
          client="freelance"
          tasks={freelanceTasks}
          context={workContexts.freelance}
          richGoal={richGoal}
        />
      </div>

      {untaggedCandidates.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/[0.04] p-3">
          <p className="text-xs text-fg-muted">
            These look like work tasks but aren&apos;t tagged yet — move to Verizon or
            Freelance:
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

      <p className="mt-3 text-[10px] text-fg-subtle">
        Edit Verizon + freelance context on{" "}
        <Link href="/manage" className="text-fg-muted underline-offset-2 hover:underline">
          /manage
        </Link>
      </p>
    </section>
  );
}
