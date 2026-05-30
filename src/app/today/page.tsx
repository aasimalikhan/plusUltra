import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserSeeded } from "@/lib/seed";
import {
  fetchActiveRules,
  fetchMacroGoals,
  fetchOrCreateTodayPlan,
  fetchSuccessRate,
  fetchTasksForPlan,
  fetchUnresolvedJournalToday,
} from "@/lib/queries";
import { autoMarkOverdueAsMissed } from "@/app/actions/tasks";
import { isEvening } from "@/lib/utils";

import { RulesBanner } from "@/components/RulesBanner";
import { VisualAnchorWall } from "@/components/VisualAnchorWall";
import { MacroGoalSection } from "@/components/MacroGoalSection";
import { SuccessRateBadge } from "@/components/SuccessRateBadge";
import { AutoMissedQueue } from "@/components/AutoMissedQueue";
import { AdHocJournalButton } from "@/components/AdHocJournalButton";
import { ResolveJournalRow } from "@/components/ResolveJournalRow";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await ensureUserSeeded(user.id);

  const evening = isEvening();
  const missedJustNow = evening ? await autoMarkOverdueAsMissed() : [];

  const [rules, goals, plan, rate] = await Promise.all([
    fetchActiveRules(),
    fetchMacroGoals(),
    fetchOrCreateTodayPlan(),
    fetchSuccessRate(14),
  ]);

  const tasks = plan ? await fetchTasksForPlan(plan.id) : [];
  const journal = plan ? await fetchUnresolvedJournalToday(plan.id) : [];

  const tasksByGoal = new Map<string, typeof tasks>();
  for (const g of goals) tasksByGoal.set(g.id, []);
  for (const t of tasks) {
    if (t.macro_goal_id && tasksByGoal.has(t.macro_goal_id)) {
      tasksByGoal.get(t.macro_goal_id)!.push(t);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="section-label">
            {evening ? "Evening · Debrief" : "Morning · Briefing"}
          </p>
          <h1 className="h1 mt-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h1>
        </div>
      </div>

      <SuccessRateBadge rate={rate.rate} done={rate.done} missed={rate.missed} />

      <RulesBanner rules={rules} />

      <VisualAnchorWall goals={goals} />

      <div className="space-y-4">
        {goals.map((g) => (
          <MacroGoalSection key={g.id} goal={g} tasks={tasksByGoal.get(g.id) ?? []} />
        ))}
      </div>

      {evening && journal.length > 0 && (
        <section className="card">
          <h2 className="section-label mb-3">Pointed journal · today</h2>
          <ul className="space-y-2">
            {journal.map((j) => (
              <ResolveJournalRow key={j.id} entry={j} />
            ))}
          </ul>
        </section>
      )}

      <AdHocJournalButton />

      <AutoMissedQueue
        active={evening}
        missed={missedJustNow.map((m) => ({ id: m.id, task_name: m.task_name }))}
      />
    </div>
  );
}
