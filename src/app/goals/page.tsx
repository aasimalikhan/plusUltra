import { fetchMacroGoals } from "@/lib/queries";
import { GoalEditor } from "./GoalEditor";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await fetchMacroGoals();
  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Management</p>
        <h1 className="h1 mt-1">Macro goals · visual anchors</h1>
        <p className="mt-2 text-sm text-fg-muted">
          The three pillars. Paste image URLs (external — no upload). Set
          deadlines per pillar.
        </p>
      </div>

      <div className="space-y-4">
        {goals.map((g) => (
          <GoalEditor key={g.id} goal={g} />
        ))}
      </div>
    </div>
  );
}
