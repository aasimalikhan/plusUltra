import { fetchRecentContext, hasAnalysisRunToday } from "@/lib/queries";
import {
  buildCursorContextMarkdown,
  buildCursorFullPayload,
} from "@/lib/context-formatter";
import {
  ANALYSIS_PROVIDERS,
  type AnalysisProvider,
} from "@/lib/analysis-providers";
import { CursorBridge } from "./CursorBridge";

export const dynamic = "force-dynamic";

export default async function CursorPage() {
  const [bundle, runAlreadyToday] = await Promise.all([
    fetchRecentContext(7),
    hasAnalysisRunToday(),
  ]);
  const markdown = buildCursorContextMarkdown(bundle);

  const payloadsByProvider = Object.fromEntries(
    ANALYSIS_PROVIDERS.map((p) => [
      p.id,
      buildCursorFullPayload(bundle, p.providerNote || undefined),
    ]),
  ) as Record<AnalysisProvider, string>;

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Bridge</p>
        <h1 className="h1 mt-1">Nightly analysis</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Copy the full payload into Cursor, Gemini, or ChatGPT — includes deadlines,
          work context, standard tasks, and 7 days of live data. Paste JSON back to
          mutate tomorrow&apos;s plan + rules.
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          Journal: /journal · Past runs: /insights · Deadlines: /deadlines · Config: /manage
        </p>
        {runAlreadyToday && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            You already applied an analysis run today. Applying again is allowed (each run is
            stored on /insights), but tomorrow&apos;s tasks and rule changes will stack — edit
            duplicates on /today if needed.
          </p>
        )}
      </div>

      <CursorBridge payloadsByProvider={payloadsByProvider} markdown={markdown} />
    </div>
  );
}
