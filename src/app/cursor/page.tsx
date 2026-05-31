import { fetchRecentContext } from "@/lib/queries";
import {
  buildCursorContextMarkdown,
  buildCursorFullPayload,
  CURSOR_ANALYST_PROMPT,
} from "@/lib/context-formatter";
import { PLUSULTRA_APP_BRIEFING } from "@/lib/app-briefing";
import { CursorBridge } from "./CursorBridge";

export const dynamic = "force-dynamic";

export default async function CursorPage() {
  const bundle = await fetchRecentContext(7);
  const markdown = buildCursorContextMarkdown(bundle);
  const fullPayload = buildCursorFullPayload(bundle);

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Bridge</p>
        <h1 className="h1 mt-1">Cursor analyst</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Copy the <strong className="font-normal text-fg">full payload</strong> into a
          brand-new Cursor chat — it includes what plusUltra is, your philosophy, routes,
          and 7 days of live data so the model is not flying blind.
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          Journal archive: /journal · Past runs: /insights · Deadlines: /deadlines · Day detail: /history/[date]
        </p>
      </div>

      <CursorBridge
        fullPayload={fullPayload}
        markdown={markdown}
        prompt={CURSOR_ANALYST_PROMPT}
        briefing={PLUSULTRA_APP_BRIEFING}
      />
    </div>
  );
}
