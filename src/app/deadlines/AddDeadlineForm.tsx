"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addDeadlineGoal } from "@/app/actions/deadlines";
import type { MacroGoal } from "@/lib/db-types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Adding…" : "Add deadline"}
    </button>
  );
}

export function AddDeadlineForm({ goals }: { goals: MacroGoal[] }) {
  const [error, formAction] = useFormState(addDeadlineGoal, null);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="section-label">Assign a deadline</h2>
      <p className="text-xs text-fg-muted">
        Deadlines are God — rank by importance and urgency. Link to a macro pillar when the work
        clearly serves RICH / MUSCULAR / INTELLIGENT.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="dl-title" className="label">
            Goal
          </label>
          <input
            id="dl-title"
            name="title"
            required
            minLength={2}
            placeholder="e.g. Science exam, Guitar skill"
            className="input mt-1"
          />
        </div>
        <div>
          <label htmlFor="dl-date" className="label">
            Target date
          </label>
          <input id="dl-date" name="target_date" type="date" required className="input mt-1" />
        </div>
        <div>
          <label htmlFor="dl-importance" className="label">
            Importance (1–5)
          </label>
          <select id="dl-importance" name="importance" defaultValue="4" className="input mt-1">
            <option value="5">5 — Critical (exam-level)</option>
            <option value="4">4 — High</option>
            <option value="3">3 — Medium</option>
            <option value="2">2 — Low</option>
            <option value="1">1 — Minimal</option>
          </select>
        </div>
        <div>
          <label htmlFor="dl-pillar" className="label">
            Macro pillar (optional)
          </label>
          <select id="dl-pillar" name="macro_goal_id" defaultValue="" className="input mt-1">
            <option value="">— none —</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.slug} — {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="dl-notes" className="label">
          Implementation plan
        </label>
        <textarea
          id="dl-notes"
          name="implementation_notes"
          rows={2}
          placeholder="What systematic work closes this deadline? e.g. 40 min DSA daily until Nov 16"
          className="input mt-1 resize-y"
        />
      </div>
      <SubmitButton />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
