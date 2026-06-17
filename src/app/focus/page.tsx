import { fetchFocusSessions } from "@/lib/queries";
import { FocusTimerClient } from "./FocusTimerClient";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const sessions = await fetchFocusSessions();

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Deep work</p>
        <h1 className="h1 mt-1">Focus</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Set your intention, start the clock, and work with zero distractions until the timer ends.
          Completed sessions are logged below.
        </p>
      </div>
      <FocusTimerClient sessions={sessions} />
    </div>
  );
}
