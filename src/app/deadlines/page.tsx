import Link from "next/link";
import { fetchDeadlineGoals, fetchMacroGoals } from "@/lib/queries";
import { AddDeadlineForm } from "./AddDeadlineForm";
import { DeadlineCard } from "./DeadlineCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deadlines · plusUltra",
  description: "V.IMP — assign deadlines, track milestone progress, feed Cursor context.",
};

export default async function DeadlinesPage() {
  const [active, completed, paused, goals] = await Promise.all([
    fetchDeadlineGoals("active"),
    fetchDeadlineGoals("completed"),
    fetchDeadlineGoals("paused"),
    fetchMacroGoals(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">V.IMP · Deadlines are God</p>
        <h1 className="h1 mt-1">Deadline command</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Assign targets, break them into milestones, track progress, and write how you&apos;ll
          implement. Sorted by urgency × importance. Cursor sees this block first in{" "}
          <Link href="/cursor" className="text-fg underline-offset-2 hover:underline">
            /cursor
          </Link>
          ; past runs live separately on{" "}
          <Link href="/insights" className="text-fg underline-offset-2 hover:underline">
            /insights
          </Link>
          . Philosophy revision:{" "}
          <Link href="/attack-mode" className="text-fg underline-offset-2 hover:underline">
            /attack-mode
          </Link>
          .
        </p>
      </div>

      <AddDeadlineForm goals={goals} />

      <section className="space-y-4">
        <h2 className="section-label">
          Active · {active.length} deadline{active.length !== 1 ? "s" : ""}
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-fg-muted">
            No active deadlines. Add one above — e.g. Exam Nov 16, Skill Nov 30, Guitar Apr 18.
          </p>
        ) : (
          active.map((d) => <DeadlineCard key={d.id} deadline={d} goals={goals} />)
        )}
      </section>

      {paused.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-label">Paused · {paused.length}</h2>
          {paused.map((d) => (
            <DeadlineCard key={d.id} deadline={d} goals={goals} />
          ))}
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-label">Completed · {completed.length}</h2>
          {completed.map((d) => (
            <DeadlineCard key={d.id} deadline={d} goals={goals} />
          ))}
        </section>
      )}
    </div>
  );
}
