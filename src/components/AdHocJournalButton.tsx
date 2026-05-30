"use client";

import { useState } from "react";
import { FixNotFixateModal } from "./FixNotFixateModal";

export function AdHocJournalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn w-full">
        <span className="text-fg-muted">+</span>
        <span>Log a trigger right now</span>
      </button>
      {open && (
        <FixNotFixateModal
          missed={[{ id: "__adhoc__", task_name: "Ad-hoc trigger" }]}
          onAllResolved={() => setOpen(false)}
        />
      )}
    </>
  );
}
