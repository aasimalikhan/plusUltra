import { fetchRecentContext } from "@/lib/queries";
import { buildCursorContextMarkdown, CURSOR_ANALYST_PROMPT } from "@/lib/context-formatter";
import { CursorBridge } from "./CursorBridge";

export const dynamic = "force-dynamic";

export default async function CursorPage() {
  const bundle = await fetchRecentContext(7);
  const markdown = buildCursorContextMarkdown(bundle);
  const fullPayload = `${CURSOR_ANALYST_PROMPT}\n\n${markdown}`;

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Bridge</p>
        <h1 className="h1 mt-1">Cursor analyst</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Copy the context block, paste it into a fresh Cursor chat, paste the
          JSON it returns back here. The raw input and output are stored in{" "}
          <span className="font-mono text-fg">analysis_runs</span> — never
          overwriting your journal.
        </p>
      </div>

      <CursorBridge fullPayload={fullPayload} markdown={markdown} prompt={CURSOR_ANALYST_PROMPT} />
    </div>
  );
}
