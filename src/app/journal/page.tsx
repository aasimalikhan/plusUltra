import Link from "next/link";
import { JournalEntryCard } from "@/components/JournalEntryCard";
import { fetchJournalArchive } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const entries = await fetchJournalArchive(90);
  const open = entries.filter((e) => !e.is_resolved).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">CBT data drops</p>
        <h1 className="h1 mt-1">Pointed journal</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Every trigger you log lives here — immutable raw logs. Created from{" "}
          <strong className="font-normal text-fg">Fix-Not-Fixate</strong> (missed
          tasks after 4pm) or{" "}
          <strong className="font-normal text-fg">Log a trigger right now</strong> on{" "}
          <Link href="/today" className="text-fg underline-offset-2 hover:underline">
            Today
          </Link>
          . Cursor cites these by id in{" "}
          <Link href="/insights" className="text-fg underline-offset-2 hover:underline">
            Insights
          </Link>
          .
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          {entries.length} entries (90d) · {open} open
        </p>
      </div>

      <section className="card">
        {entries.length === 0 ? (
          <div className="space-y-2 text-sm text-fg-muted">
            <p>No journal entries yet.</p>
            <Link href="/today" className="btn btn-primary inline-flex">
              Go to Today → log a trigger
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <JournalEntryCard key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
