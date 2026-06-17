import {
  fetchDayCaptures,
  fetchRecentContext,
  hasAnalysisRunToday,
} from "@/lib/queries";
import {
  buildContextSummary,
  buildCursorContextMarkdown,
  buildCursorFullPayload,
} from "@/lib/context-formatter";
import { getAnalysisProvider } from "@/lib/analysis-providers";
import { getAppTimezone, isGeminiConfigured } from "@/lib/analysis-env";
import { CursorBridge } from "./CursorBridge";

export const dynamic = "force-dynamic";

export default async function CursorPage() {
  const [bundle, runAlreadyToday, geminiApiEnabled, captures] = await Promise.all([
    fetchRecentContext(7),
    hasAnalysisRunToday(),
    Promise.resolve(isGeminiConfigured()),
    fetchDayCaptures(),
  ]);
  const markdown = buildCursorContextMarkdown(bundle);
  const fullPayload = buildCursorFullPayload(
    bundle,
    getAnalysisProvider("gemini").providerNote || undefined,
  );
  const contextSummary = buildContextSummary(bundle);
  const timezone = getAppTimezone();

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Analysis</p>
        <h1 className="h1 mt-1">Nightly analysis</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Gemini reads your full context — tasks, journal, deadlines, goals, rules, and day
          captures — then mutates tomorrow&apos;s plan. Runs automatically at midnight, or on
          demand below (one call per day).
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          Captures: /captures · Past runs: /insights · Deadlines: /deadlines · Config: /manage
        </p>
      </div>

      <CursorBridge
        markdown={markdown}
        fullPayload={fullPayload}
        contextSummary={contextSummary}
        geminiApiEnabled={geminiApiEnabled}
        runAlreadyToday={runAlreadyToday}
        captureCount={captures.length}
        timezone={timezone}
      />
    </div>
  );
}
