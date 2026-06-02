import { requireUser } from "@/lib/auth/user";
import { ensureUserSeeded } from "@/lib/seed";
import {
  fetchActiveRules,
  fetchDeadlineGoals,
  fetchMacroGoals,
  fetchMissedTasksNeedingJournal,
  fetchOrCreateTodayPlan,
  fetchSuccessRate,
  fetchTasksForPlan,
  fetchTodayExecution,
  fetchTomorrowTaskCount,
  fetchUnresolvedJournalToday,
  hasAnalysisRunToday,
} from "@/lib/queries";
import { autoMarkOverdueAsMissed } from "@/app/actions/tasks";
import { isDebriefTime, isEvening } from "@/lib/utils";

import { RulesBanner } from "@/components/RulesBanner";
import { DeadlineStrip } from "@/components/DeadlineStrip";
import { VisualAnchorWall } from "@/components/VisualAnchorWall";
import { MacroGoalSection } from "@/components/MacroGoalSection";
import { SuccessRateBadge } from "@/components/SuccessRateBadge";
import { TodayExecutionBadge } from "@/components/TodayExecutionBadge";
import { EveningDebrief } from "@/components/EveningDebrief";
import { AdHocJournalButton } from "@/components/AdHocJournalButton";
import { ResolveJournalRow } from "@/components/ResolveJournalRow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await requireUser();
  await ensureUserSeeded(user.userId);
  await fetchOrCreateTodayPlan();
  await autoMarkOverdueAsMissed();

  const evening = isEvening();
  const debriefTime = isDebriefTime();

  const [rules, goals, plan, rate, deadlines] = await Promise.all([
    fetchActiveRules(),
    fetchMacroGoals(),
    fetchOrCreateTodayPlan(),
    fetchSuccessRate(14),
    fetchDeadlineGoals("active"),
  ]);

  const tasks = plan ? await fetchTasksForPlan(plan.id) : [];
  const journal = plan ? await fetchUnresolvedJournalToday(plan.id) : [];

  const [todayExec, missedNeedingJournal, analysisRunToday, tomorrowCount] =
    plan
      ? await Promise.all([
          fetchTodayExecution(plan.id),
          fetchMissedTasksNeedingJournal(7),
          hasAnalysisRunToday(),
          fetchTomorrowTaskCount(),
        ])
      : [
          { done: 0, pending: 0, missed: 0 },
          [] as Awaited<ReturnType<typeof fetchMissedTasksNeedingJournal>>,
          false,
          0,
        ];

  const tasksByGoal = new Map<string, typeof tasks>();
  for (const g of goals) tasksByGoal.set(g.id, []);
  for (const t of tasks) {
    if (t.macro_goal_id && tasksByGoal.has(t.macro_goal_id)) {
      tasksByGoal.get(t.macro_goal_id)!.push(t);
    }
  }

  const showDebrief =
    debriefTime ||
    plan?.is_locked === true ||
    todayExec.pending > 0 ||
    missedNeedingJournal.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="section-label">
            {evening ? "Evening · Debrief" : debriefTime ? "Afternoon · Wind-down" : "Morning · Briefing"}
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

      <SuccessRateBadge
        rate={rate.rate}
        done={rate.done}
        missed={rate.missed}
        pending={rate.pending}
      />

      {plan && (
        <TodayExecutionBadge
          today={todayExec}
          planLocked={plan.is_locked}
          isEvening={evening}
        />
      )}

      {showDebrief && plan && (
        <EveningDebrief
          visible={showDebrief}
          planLocked={plan.is_locked}
          isEvening={evening}
          today={todayExec}
          missedNeedingJournal={missedNeedingJournal}
          hasAnalysisRun={analysisRunToday}
          tomorrowTaskCount={tomorrowCount}
        />
      )}

      <RulesBanner rules={rules} />

      <DeadlineStrip deadlines={deadlines} />

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

      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/deadlines" className="pill transition-colors hover:bg-bg-subtle">
          Deadlines →
        </Link>
        <Link href="/journal" className="pill transition-colors hover:bg-bg-subtle">
          All journal entries →
        </Link>
        <Link href="/insights" className="pill transition-colors hover:bg-bg-subtle">
          Analysis runs →
        </Link>
        {debriefTime && !analysisRunToday && (
          <Link href="/cursor" className="pill border-amber-500/40 text-amber-200 transition-colors hover:bg-amber-500/10">
            Cursor analyst →
          </Link>
        )}
      </div>
    </div>
  );
}
