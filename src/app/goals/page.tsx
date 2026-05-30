import { fetchMacroGoals } from "@/lib/queries";
import { AddMacroGoalForm } from "./AddMacroGoalForm";
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
          Identity-level pillars (not chores). Edit title, deadline, and anchor image per
          pillar. Add your own beyond RICH / MUSCULAR / INTELLIGENT — they show on{" "}
          <strong className="font-normal text-fg">Today</strong> and in Cursor context.
        </p>
      </div>

      <AddMacroGoalForm />

      <div className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-sm text-fg-muted">No macro goals yet. Add one above.</p>
        ) : (
          goals.map((g) => (
            <GoalEditor key={g.id} goal={g} canDelete={goals.length > 1} />
          ))
        )}
      </div>
    </div>
  );
}
