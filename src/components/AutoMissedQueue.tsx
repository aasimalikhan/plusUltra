"use client";

import { useEffect, useState } from "react";
import { FixNotFixateModal, type MissedTaskLite } from "./FixNotFixateModal";

export function AutoMissedQueue({
  missed,
  active,
}: {
  missed: MissedTaskLite[];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (active && missed.length > 0) setOpen(true);
  }, [active, missed.length]);

  if (!open) return null;

  return (
    <FixNotFixateModal missed={missed} onAllResolved={() => setOpen(false)} />
  );
}
