"use client";

import { useTransition } from "react";
import {
  addTaskTemplate,
  deleteTaskTemplate,
  saveWorkContext,
  updateTaskTemplate,
} from "@/app/actions/manage";
import type { MacroGoal, TaskTemplate } from "@/lib/db-types";
import type { WorkContextBundle } from "@/lib/work-context";

function TemplateRow({
  template,
  goals,
}: {
  template: TaskTemplate;
  goals: MacroGoal[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        template.is_active
          ? "border-bg-border bg-bg-subtle"
          : "border-bg-border/50 bg-bg-subtle/40 opacity-60"
      }`}
    >
      <span className="flex-1 text-fg">{template.task_name}</span>
      <span className="pill">{template.category}</span>
      <span className="pill">
        {goals.find((g) => g.id === template.macro_goal_id)?.slug ?? "—"}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() =>
            updateTaskTemplate(template.id, { is_active: !template.is_active }),
          )
        }
        className="btn text-xs"
      >
        {template.is_active ? "Pause" : "Activate"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this standard task template?")) {
            startTransition(() => deleteTaskTemplate(template.id));
          }
        }}
        className="btn text-xs text-red-400"
      >
        Delete
      </button>
    </li>
  );
}

export function ManageClient({
  templates,
  goals,
  workContexts,
}: {
  templates: TaskTemplate[];
  goals: MacroGoal[];
  workContexts: WorkContextBundle;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div>
          <p className="section-label">Standard daily tasks</p>
          <p className="mt-1 text-sm text-fg-muted">
            These roll onto /today each morning if missing. Edit here — not hard-coded.
            Personal standards (System Design, DSA, gym…) vs one-off Verizon tasks added
            manually on the day.
          </p>
        </div>

        {templates.length === 0 ? (
          <p className="text-xs italic text-fg-subtle">
            No templates yet — defaults seed on first visit.
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <TemplateRow key={t.id} template={t} goals={goals} />
            ))}
          </ul>
        )}

        <form
          action={(fd) => startTransition(() => addTaskTemplate(fd))}
          className="flex flex-wrap gap-2 border-t border-bg-border pt-3"
        >
          <input
            name="task_name"
            required
            placeholder="New standard task…"
            className="input min-w-[200px] flex-1"
          />
          <select name="macro_goal_id" className="input w-auto">
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.slug}
              </option>
            ))}
          </select>
          <select name="category" className="input w-auto" defaultValue="personal">
            <option value="personal">personal</option>
            <option value="work">work</option>
          </select>
          <button type="submit" disabled={pending} className="btn btn-primary">
            Add standard
          </button>
        </form>
      </section>

      <section className="card space-y-4">
        <div>
          <p className="section-label">Work context</p>
          <p className="mt-1 text-sm text-fg-muted">
            Injected into every Gemini analysis run. Keep Verizon (employer) and freelance
            (side clients) separate — open loops, projects, performance notes.
          </p>
        </div>
        <form
          action={(fd) => startTransition(() => saveWorkContext(fd))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="label">Verizon · employer</label>
            <textarea
              name="work_context_verizon"
              rows={6}
              defaultValue={workContexts.verizon ?? ""}
              placeholder="e.g. Verizon software engineer. GEMS Gallery UAT, DLM vulnerabilities, one-in-one-out rule…"
              className="input font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="label">Freelance · side clients</label>
            <textarea
              name="work_context_freelance"
              rows={6}
              defaultValue={workContexts.freelance ?? ""}
              placeholder="e.g. Afroz uncle image slider, Cursor bills, mallsapp freelance tickets, In-Store Scanner app…"
              className="input font-mono text-xs"
            />
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary">
            Save work context
          </button>
        </form>
      </section>

      <section className="card space-y-2 text-xs text-fg-muted">
        <p className="section-label">How the day lock works</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="font-normal text-fg">6pm</strong> — evening debrief panel
            appears on /today
          </li>
          <li>
            <strong className="font-normal text-fg">11pm</strong> — on your next /today
            visit, all pending tasks flip to missed and the day locks. No background cron
            — you must open /today after 11pm (or any past day auto-locks on next visit)
          </li>
          <li>
            Pending counts as incomplete in the 14-day rate only after lock
          </li>
        </ul>
      </section>
    </div>
  );
}
