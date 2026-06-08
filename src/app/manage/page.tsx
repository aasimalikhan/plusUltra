import { requireUser } from "@/lib/auth/user";
import { fetchMacroGoals, fetchTaskTemplates, fetchWorkContext } from "@/lib/queries";
import { getServerDb } from "@/lib/db";
import { ensureDefaultTaskTemplates } from "@/lib/standard-tasks";
import { ManageClient } from "./ManageClient";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  await requireUser();
  const { supabase, userId } = await getServerDb();
  await ensureDefaultTaskTemplates(supabase, userId);

  const [templates, goals, workContext] = await Promise.all([
    fetchTaskTemplates(),
    fetchMacroGoals(),
    fetchWorkContext(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="section-label">Configuration</p>
        <h1 className="h1 mt-1">Manage</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Standard daily tasks, work context for analysis, and system mechanics.
        </p>
      </div>
      <ManageClient templates={templates} goals={goals} workContext={workContext} />
    </div>
  );
}
