import Link from "next/link";
import type { AnalysisRun } from "@/lib/db-types";
import { fetchAnalysisRunsArchive } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const runs = await fetchAnalysisRunsArchive(50);

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Cursor analyst archive</p>
        <h1 className="h1 mt-1">Analysis runs</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Each row is one Cursor session you applied from{" "}
          <Link href="/cursor" className="text-fg underline-offset-2 hover:underline">
            /cursor
          </Link>
          . Raw JSON is stored verbatim (anti–summarization-drift). Journal entries are never
          overwritten — only cited.
        </p>
        <p className="mt-1 text-xs text-fg-subtle">{runs.length} runs stored</p>
      </div>

      <section className="card">
        {runs.length === 0 ? (
          <div className="space-y-2 text-sm text-fg-muted">
            <p>No analysis runs yet. Copy context from Cursor bridge, paste JSON back, Apply.</p>
            <Link href="/cursor" className="btn btn-primary inline-flex">
              Open Cursor bridge
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-bg-border">
            {runs.map((r) => (
              <AnalysisRunRow key={r.id} run={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AnalysisRunRow({ run }: { run: AnalysisRun }) {
  const citedJ = (run.cited_journal_ids ?? []).length;
  const citedT = (run.cited_task_ids ?? []).length;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/history/${run.run_date}`}
          className="font-mono text-sm text-fg transition-colors hover:text-fg-muted"
        >
          {run.run_date}
        </Link>
        <span className="text-[10px] uppercase tracking-wider text-fg-subtle">
          {new Date(run.created_at).toLocaleString()}
        </span>
      </div>
      <p className="mt-2 text-sm text-fg">{run.summary ?? "(no summary)"}</p>
      <p className="mt-1 text-xs text-fg-subtle">
        Cited {citedJ} journal · {citedT} tasks · run {run.id.slice(0, 8)}…
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-fg-subtle hover:text-fg">
          Raw Cursor JSON
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-sm bg-bg/60 p-2 font-mono text-[10px] text-fg-muted">
          {JSON.stringify(run.cursor_raw_output, null, 2)}
        </pre>
      </details>
      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-fg-subtle hover:text-fg">
          Context markdown sent
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-sm bg-bg/60 p-2 font-mono text-[10px] text-fg-muted">
          {typeof run.cursor_raw_input === "object" &&
          run.cursor_raw_input !== null &&
          "markdown" in (run.cursor_raw_input as Record<string, unknown>)
            ? String((run.cursor_raw_input as Record<string, unknown>).markdown)
            : JSON.stringify(run.cursor_raw_input, null, 2)}
        </pre>
      </details>
    </li>
  );
}
