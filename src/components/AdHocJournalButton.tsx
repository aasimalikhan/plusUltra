"use client";

import { useState } from "react";
import { FixNotFixateModal } from "./FixNotFixateModal";

export function AdHocJournalButton() {
  const [open, setOpen] = useState(false);
  return (
    <section className="card space-y-2">
      <div>
        <p className="section-label">Pointed journal</p>
        <p className="mt-1 text-xs text-fg-muted">
          <strong className="font-normal text-fg">Log a trigger</strong> — capture a
          pattern anytime (scroll, urge, distraction). Saved to /journal; does{" "}
          <em>not</em> auto-queue a tomorrow task.
        </p>
        <p className="mt-1 text-[10px] text-fg-subtle">
          Evening <strong className="font-normal text-fg-muted">Log repairs</strong> — only
          for missed tasks; each repair becomes tomorrow&apos;s linear action.
        </p>
      </div>
      <button onClick={() => setOpen(true)} className="btn w-full">
        <span className="text-fg-muted">+</span>
        <span>Log a trigger right now</span>
      </button>
      {open && (
        <FixNotFixateModal
          mode="adhoc"
          missed={[{ id: "__adhoc__", task_name: "Ad-hoc trigger" }]}
          onAllResolved={() => setOpen(false)}
        />
      )}
    </section>
  );
}
