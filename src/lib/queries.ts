import { getServerDb } from "@/lib/db";
import { formatDateISO, tomorrowDateISO } from "@/lib/utils";
import { formatDateISOInTz } from "@/lib/timezone";
import { urgencyScore } from "@/lib/deadline-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MacroGoal,
  Task,
  Rule,
  PointedJournal,
  DailyPlan,
  AnalysisRun,
  DeadlineGoal,
  DeadlineMilestone,
  DeadlineGoalWithMilestones,
  TaskTemplate,
  DayCapture,
} from "@/lib/db-types";

export async function fetchActiveRules(): Promise<Rule[]> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("rules")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("last_relevant_at", { ascending: false });
  return (data ?? []) as Rule[];
}

export async function fetchAllRules(): Promise<Rule[]> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("rules")
    .select("*")
    .eq("user_id", userId)
    .order("is_active", { ascending: false })
    .order("priority", { ascending: true });
  return (data ?? []) as Rule[];
}

export async function fetchMacroGoals(): Promise<MacroGoal[]> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("macro_goals")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  return (data ?? []) as MacroGoal[];
}

export async function fetchOrCreateTodayPlan(): Promise<DailyPlan | null> {
  const { supabase, userId } = await getServerDb();
  const today = formatDateISO();
  const { data: existing } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", today)
    .maybeSingle();
  if (existing) return existing as DailyPlan;
  const { data: created } = await supabase
    .from("daily_plans")
    .insert({ user_id: userId, plan_date: today })
    .select("*")
    .single();
  return (created as DailyPlan) ?? null;
}

export async function fetchTasksForPlan(planId: string): Promise<Task[]> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("daily_plan_id", planId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Task[];
}

export async function fetchUnresolvedJournalToday(
  planId: string,
): Promise<PointedJournal[]> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("pointed_journal")
    .select("*")
    .eq("user_id", userId)
    .eq("daily_plan_id", planId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PointedJournal[];
}

export async function fetchSuccessRate(
  days = 14,
  category?: "personal" | "work",
): Promise<{ rate: number; done: number; missed: number; pending: number }> {
  const { supabase, userId } = await getServerDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  let q = supabase
    .from("tasks")
    .select("status, created_at, category")
    .eq("user_id", userId)
    .gte("created_at", sinceISO);

  const { data } = await q;

  let done = 0;
  let missed = 0;
  let pending = 0;
  for (const row of data ?? []) {
    const cat = (row.category as string | null) ?? "personal";
    if (category === "personal" && cat === "work") continue;
    if (category === "work" && cat !== "work") continue;
    if (row.status === "done") done++;
    else if (row.status === "missed") missed++;
    else if (row.status === "pending") pending++;
  }
  const total = done + missed;
  return { rate: total === 0 ? 0 : done / total, done, missed, pending };
}

export interface TodayExecution {
  done: number;
  pending: number;
  missed: number;
}

export async function fetchTodayExecution(
  planId: string,
  category?: "personal" | "work",
): Promise<TodayExecution> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("tasks")
    .select("status, category")
    .eq("user_id", userId)
    .eq("daily_plan_id", planId);

  let done = 0;
  let pending = 0;
  let missed = 0;
  for (const row of data ?? []) {
    const cat = (row.category as string | null) ?? "personal";
    if (category === "personal" && cat === "work") continue;
    if (category === "work" && cat !== "work") continue;
    if (row.status === "done") done++;
    else if (row.status === "missed") missed++;
    else pending++;
  }
  return { done, pending, missed };
}

export interface MissedTaskNeedingJournal {
  id: string;
  task_name: string;
  plan_date: string;
}

/** Missed tasks from the last N days with no linked journal entry. */
export async function fetchMissedTasksNeedingJournal(
  daysBack = 7,
): Promise<MissedTaskNeedingJournal[]> {
  const { supabase, userId } = await getServerDb();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data: plans } = await supabase
    .from("daily_plans")
    .select("id, plan_date")
    .eq("user_id", userId)
    .gte("plan_date", sinceDate);

  if (!plans?.length) return [];

  const planIds = plans.map((p) => p.id);
  const planDateById = new Map(plans.map((p) => [p.id, p.plan_date as string]));

  const [{ data: missedTasks }, { data: journaled }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, task_name, daily_plan_id, category")
      .eq("user_id", userId)
      .in("daily_plan_id", planIds)
      .eq("status", "missed"),
    supabase
      .from("pointed_journal")
      .select("related_task_id")
      .eq("user_id", userId)
      .not("related_task_id", "is", null),
  ]);

  const journaledIds = new Set(
    (journaled ?? []).map((j) => j.related_task_id as string),
  );

  return (missedTasks ?? [])
    .filter((t) => ((t.category as string | null) ?? "personal") !== "work")
    .filter((t) => !journaledIds.has(t.id))
    .map((t) => ({
      id: t.id,
      task_name: t.task_name,
      plan_date: planDateById.get(t.daily_plan_id) ?? "",
    }))
    .sort((a, b) => b.plan_date.localeCompare(a.plan_date));
}

export async function hasAnalysisRunToday(): Promise<boolean> {
  const { supabase, userId } = await getServerDb();
  return hasAnalysisRunOnDate(supabase, userId, formatDateISOInTz());
}

export async function hasAnalysisRunOnDate(
  supabase: SupabaseClient,
  userId: string,
  runDate: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("run_date", runDate);
  return (count ?? 0) > 0;
}

export async function fetchDayCaptures(): Promise<DayCapture[]> {
  const { supabase, userId } = await getServerDb();
  return fetchDayCapturesForUser(supabase, userId);
}

export async function fetchDayCapturesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<DayCapture[]> {
  const { data, error } = await supabase
    .from("day_captures")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    if (/day_captures|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []) as DayCapture[];
}

export async function fetchTomorrowTaskCount(): Promise<number> {
  const { supabase, userId } = await getServerDb();
  const tomorrowISO = tomorrowDateISO();

  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_date", tomorrowISO)
    .maybeSingle();
  if (!plan) return 0;

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("daily_plan_id", plan.id);
  return count ?? 0;
}

export async function fetchDeadlineGoalsForUser(
  supabase: SupabaseClient,
  userId: string,
  status: "active" | "completed" | "paused" | "all" = "active",
): Promise<DeadlineGoalWithMilestones[]> {
  let q = supabase
    .from("deadline_goals")
    .select("*")
    .eq("user_id", userId)
    .order("target_date", { ascending: true });

  if (status !== "all") q = q.eq("status", status);

  const { data: goals } = await q;
  const goalRows = (goals ?? []) as DeadlineGoal[];
  if (goalRows.length === 0) return [];

  const goalIds = goalRows.map((g) => g.id);
  const { data: milestones } = await supabase
    .from("deadline_milestones")
    .select("*")
    .eq("user_id", userId)
    .in("deadline_goal_id", goalIds)
    .order("sort_order", { ascending: true });

  const byGoal = new Map<string, DeadlineMilestone[]>();
  for (const m of (milestones ?? []) as DeadlineMilestone[]) {
    if (!byGoal.has(m.deadline_goal_id)) byGoal.set(m.deadline_goal_id, []);
    byGoal.get(m.deadline_goal_id)!.push(m);
  }

  return goalRows
    .map((g) => ({
      ...g,
      milestones: byGoal.get(g.id) ?? [],
    }))
    .sort((a, b) => urgencyScore(b) - urgencyScore(a));
}

export async function fetchDeadlineGoals(
  status: "active" | "completed" | "paused" | "all" = "active",
): Promise<DeadlineGoalWithMilestones[]> {
  const { supabase, userId } = await getServerDb();
  return fetchDeadlineGoalsForUser(supabase, userId, status);
}

export async function fetchTaskTemplates(): Promise<TaskTemplate[]> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("task_templates")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  return (data ?? []) as TaskTemplate[];
}

export async function fetchWorkContext(): Promise<string | null> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("profiles")
    .select("work_context")
    .eq("id", userId)
    .maybeSingle();
  return (data?.work_context as string | null) ?? null;
}

export async function fetchRecentContext(days = 7) {
  const { supabase, userId } = await getServerDb();
  return fetchRecentContextForUser(supabase, userId, days);
}

export async function fetchRecentContextForUser(
  supabase: SupabaseClient,
  userId: string,
  days = 7,
) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const [plans, tasks, journal, rules, goals, runs, deadlines, deadlineHistory, workContext, templates, captures] =
    await Promise.all([
    supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", userId)
      .gte("plan_date", sinceDate)
      .order("plan_date", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("pointed_journal")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("rules")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("priority"),
    supabase
      .from("macro_goals")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order"),
    supabase
      .from("analysis_runs")
      .select("*")
      .eq("user_id", userId)
      .gte("run_date", sinceDate)
      .order("run_date", { ascending: true }),
    fetchDeadlineGoalsForUser(supabase, userId, "active"),
    fetchDeadlineGoalsForUser(supabase, userId, "all").then((all) =>
      all.filter((d) => d.status !== "active"),
    ),
    supabase
      .from("profiles")
      .select("work_context")
      .eq("id", userId)
      .maybeSingle()
      .then((r) => (r.data?.work_context as string | null) ?? null),
    supabase
      .from("task_templates")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order")
      .then((r) => (r.data ?? []) as TaskTemplate[]),
    fetchDayCapturesForUser(supabase, userId),
  ]);

  return {
    plans: (plans.data ?? []) as DailyPlan[],
    tasks: (tasks.data ?? []) as Task[],
    journal: (journal.data ?? []) as PointedJournal[],
    rules: (rules.data ?? []) as Rule[],
    goals: (goals.data ?? []) as MacroGoal[],
    runs: (runs.data ?? []) as AnalysisRun[],
    deadlines,
    deadlineHistory,
    workContext,
    templates,
    captures,
  };
}

export async function fetchJournalArchive(days = 90): Promise<PointedJournal[]> {
  const { supabase, userId } = await getServerDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("pointed_journal")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []) as PointedJournal[];
}

export async function fetchAnalysisRunsArchive(
  limit = 50,
): Promise<AnalysisRun[]> {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AnalysisRun[];
}
