import { requireUser } from "@/lib/auth/user";
import { ensureUserSeeded } from "@/lib/seed";
import {
  fetchActiveRules,
  fetchDailyWorkCutoff,
  fetchDeadlineGoals,
  fetchMacroGoals,
  fetchMissedTasksNeedingJournal,
  fetchOrCreateTodayPlan,
  fetchSuccessRate,
  fetchTasksForPlan,
  fetchTodayExecution,
  fetchTomorrowTaskCount,
  fetchUnresolvedJournalToday,
  fetchWorkContextBundle,
  hasAnalysisRunToday,
} from "@/lib/queries";
import { autoMarkOverdueAsMissed } from "@/app/actions/tasks";
import { isDebriefTime, isEvening } from "@/lib/utils";
import { isPastWorkCutoff } from "@/lib/timezone";
import { getServerDb } from "@/lib/db";
import { ensureTodayStandardTasks } from "@/lib/standard-tasks";
import { isPersonalTask, isWorkCandidate, isWorkTask } from "@/lib/task-utils";

import { RulesBanner } from "@/components/RulesBanner";
import { DeadlineStrip } from "@/components/DeadlineStrip";
import { VisualAnchorWall } from "@/components/VisualAnchorWall";
import { MacroGoalSection } from "@/components/MacroGoalSection";
import { SuccessRateBadge } from "@/components/SuccessRateBadge";
import { TodayExecutionBadge } from "@/components/TodayExecutionBadge";
import { WorkSection } from "@/components/WorkSection";
import { ViaNegativaSection } from "@/components/ViaNegativaSection";
import { EveningDebrief } from "@/components/EveningDebrief";
import { AdHocJournalButton } from "@/components/AdHocJournalButton";
import { ResolveJournalRow } from "@/components/ResolveJournalRow";
import Link from "next/link";
import type { Task } from "@/lib/db-types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await requireUser();
  await ensureUserSeeded(user.userId);
  await fetchOrCreateTodayPlan();
  await autoMarkOverdueAsMissed();

  const { supabase, userId } = await getServerDb();
  await ensureTodayStandardTasks(supabase, userId);

  const evening = isEvening();
  const debriefTime = isDebriefTime();

  const [rules, goals, plan, personalRate, workRate, deadlines, workContexts, dailyWorkCutoff] =
    await Promise.all([
      fetchActiveRules(),
      fetchMacroGoals(),
      fetchOrCreateTodayPlan(),
      fetchSuccessRate(14, "personal"),
      fetchSuccessRate(14, "work"),
      fetchDeadlineGoals("active"),
      fetchWorkContextBundle(),
      fetchDailyWorkCutoff(),
    ]);

  const tasks = plan ? await fetchTasksForPlan(plan.id) : [];
  const journal = plan ? await fetchUnresolvedJournalToday(plan.id) : [];
  const richGoal = goals.find((g) => g.slug === "RICH");

  const workTasks = tasks.filter(isWorkTask);
  const antiTasks = tasks.filter((t) => t.is_anti_task && isPersonalTask(t));
  const untaggedCandidates = tasks.filter((t) =>
    isWorkCandidate(t, richGoal?.id),
  );
  const workLocked = isPastWorkCutoff(dailyWorkCutoff);

  const [personalExec, workExec, missedNeedingJournal, analysisRunToday, tomorrowCount] =
    plan
      ? await Promise.all([
          fetchTodayExecution(plan.id, "personal"),
          fetchTodayExecution(plan.id, "work"),
          fetchMissedTasksNeedingJournal(7),
          hasAnalysisRunToday(),
          fetchTomorrowTaskCount(),
        ])
      : [
          { done: 0, pending: 0, missed: 0 },
          { done: 0, pending: 0, missed: 0 },
          [] as Awaited<ReturnType<typeof fetchMissedTasksNeedingJournal>>,
          false,
          0,
        ];

  const tasksByGoal = new Map<string, Task[]>();
  for (const g of goals) tasksByGoal.set(g.id, []);
  for (const t of tasks) {
    if (!isPersonalTask(t)) continue;
    if (t.is_anti_task) continue;
    if (t.macro_goal_id && tasksByGoal.has(t.macro_goal_id)) {
      tasksByGoal.get(t.macro_goal_id)!.push(t);
    }
  }

  const showDebrief =
    debriefTime ||
    plan?.is_locked === true ||
    personalExec.pending > 0 ||
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

      <div className="grid gap-3 lg:grid-cols-2">
        <SuccessRateBadge
          rate={personalRate.rate}
          done={personalRate.done}
          missed={personalRate.missed}
          pending={personalRate.pending}
          label="system"
        />
        <SuccessRateBadge
          rate={workRate.rate}
          done={workRate.done}
          missed={workRate.missed}
          pending={workRate.pending}
          label="work"
        />
      </div>

      {plan && (
        <div className="grid gap-3 lg:grid-cols-2">
          <TodayExecutionBadge
            today={personalExec}
            planLocked={plan.is_locked}
            isEvening={evening}
            variant="personal"
          />
          <TodayExecutionBadge
            today={workExec}
            planLocked={plan.is_locked}
            isEvening={evening}
            variant="work"
          />
        </div>
      )}

      {showDebrief && plan && (
        <EveningDebrief
          visible={showDebrief}
          planLocked={plan.is_locked}
          today={personalExec}
          missedNeedingJournal={missedNeedingJournal}
          hasAnalysisRun={analysisRunToday}
          tomorrowTaskCount={tomorrowCount}
        />
      )}

      <WorkSection
        workTasks={workTasks}
        richGoal={richGoal}
        untaggedCandidates={untaggedCandidates}
        workContexts={workContexts}
        workLocked={workLocked}
      />

      <RulesBanner rules={rules} />

      <ViaNegativaSection tasks={antiTasks} goals={goals} />

      <DeadlineStrip deadlines={deadlines} />

      <VisualAnchorWall goals={goals} />

      <div>
        <p className="section-label mb-3">Personal system · RICH / MUSCULAR / INTELLIGENT</p>
        <div className="space-y-4">
          {goals.map((g) => (
            <MacroGoalSection
              key={g.id}
              goal={g}
              tasks={tasksByGoal.get(g.id) ?? []}
            />
          ))}
        </div>
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
        <Link href="/manage" className="pill transition-colors hover:bg-bg-subtle">
          Manage →
        </Link>
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
