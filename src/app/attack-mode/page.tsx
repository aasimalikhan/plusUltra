import { AttackModeReader } from "@/components/AttackModeReader";
import { ATTACK_MODE_CHUNKS } from "@/content/attack-mode";

export const metadata = {
  title: "Attack mode · plusUltra",
  description: "Revise the full attack mode framework — local search, no API.",
};

export default function AttackModePage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Framework reference</p>
        <h1 className="h1 mt-1">Attack mode</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Full revision deck — brain mechanics, logical slavery, repair-not-blame,
          journaling, power system. Search runs entirely in your browser (
          {ATTACK_MODE_CHUNKS.length} topics). Press{" "}
          <kbd className="rounded border border-bg-border bg-bg-subtle px-1 py-0.5 font-display text-[10px]">
            Ctrl K
          </kbd>{" "}
          to find anything.
        </p>
      </div>

      <AttackModeReader />
    </div>
  );
}
