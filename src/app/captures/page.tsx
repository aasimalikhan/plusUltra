import { fetchDayCaptures } from "@/lib/queries";
import { CapturesClient } from "./CapturesClient";

export const dynamic = "force-dynamic";

export default async function CapturesPage() {
  const captures = await fetchDayCaptures();

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Inbox</p>
        <h1 className="h1 mt-1">Day captures</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Quick dump for reels, links, and thoughts. Nightly Gemini analysis reads everything here,
          uses what matters for tomorrow&apos;s plan, then wipes the list.
        </p>
      </div>
      <CapturesClient captures={captures} />
    </div>
  );
}
