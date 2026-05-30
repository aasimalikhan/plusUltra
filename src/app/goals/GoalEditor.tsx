"use client";

import { useState, useTransition } from "react";
import { updateGoal } from "@/app/actions/goals";
import type { MacroGoal } from "@/lib/db-types";

const PILL: Record<string, string> = {
  RICH: "pill pill-rich",
  MUSCULAR: "pill pill-muscular",
  INTELLIGENT: "pill pill-intelligent",
};

export function GoalEditor({ goal }: { goal: MacroGoal }) {
  const [title, setTitle] = useState(goal.title);
  const [url, setUrl] = useState(goal.visual_anchor_url ?? "");
  const [deadline, setDeadline] = useState(goal.deadline ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

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

  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-3">
        <span className={PILL[goal.slug] ?? "pill"}>{goal.slug}</span>
        {saved && <span className="text-xs text-emerald-400">saved</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1" />
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

      <button onClick={save} disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </section>
  );
}
