"use client";

import { useState, useTransition } from "react";
import { deleteMacroGoal, updateGoal } from "@/app/actions/goals";
import type { MacroGoal } from "@/lib/db-types";
import { macroGoalPillClass } from "@/lib/macro-goal-ui";

export function GoalEditor({
  goal,
  canDelete,
}: {
  goal: MacroGoal;
  canDelete: boolean;
}) {
  const [title, setTitle] = useState(goal.title);
  const [url, setUrl] = useState(goal.visual_anchor_url ?? "");
  const [deadline, setDeadline] = useState(goal.deadline ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      await updateGoal(goal.id, {
        title,
        visual_anchor_url: url || null,
        deadline: deadline || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  function remove() {
    if (
      !confirm(
        `Delete pillar "${goal.slug}"? Tasks under it stay but lose their pillar link.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const err = await deleteMacroGoal(goal.id);
      setDeleteError(err);
    });
  }

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={macroGoalPillClass(goal.slug)}>{goal.slug}</span>
          {saved && <span className="text-xs text-emerald-400">saved</span>}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-xs text-red-400/80 transition-colors hover:text-red-400"
          >
            Delete pillar
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label">Deadline (optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="input mt-1"
          />
        </div>
      </div>

      <div>
        <label className="label">Visual anchor image URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="input mt-1 font-mono text-xs"
        />
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="mt-2 h-32 w-full rounded-md object-cover opacity-90"
            onError={(e) =>
              ((e.target as HTMLImageElement).style.display = "none")
            }
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
    </section>
  );
}
