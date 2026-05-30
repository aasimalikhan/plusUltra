"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addMacroGoal } from "@/app/actions/goals";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Adding…" : "Add macro goal"}
    </button>
  );
}

export function AddMacroGoalForm() {
  const [error, formAction] = useFormState(addMacroGoal, null);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="section-label">Add a pillar</h2>
      <p className="text-xs text-fg-muted">
        Default three are RICH / MUSCULAR / INTELLIGENT. You can add more (e.g. RELATIONSHIPS,
        SPIRITUAL). Slug is used by Cursor when assigning tomorrow&apos;s tasks.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="goal-title" className="label">
            Title
          </label>
          <input
            id="goal-title"
            name="title"
            required
            minLength={2}
            placeholder="e.g. Become incredibly calm"
            className="input mt-1"
          />
        </div>
        <div>
          <label htmlFor="goal-slug" className="label">
            Slug (optional)
          </label>
          <input
            id="goal-slug"
            name="slug"
            placeholder="Auto from title, e.g. CALM"
            className="input mt-1 font-mono text-xs uppercase"
          />
        </div>
      </div>
      <SubmitButton />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
