import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateISO } from "@/lib/utils";
import type {
  MacroGoal,
  Task,
  Rule,
  PointedJournal,
  DailyPlan,
  AnalysisRun,
} from "@/lib/db-types";

export async function fetchActiveRules(): Promise<Rule[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("last_relevant_at", { ascending: false });
  return (data ?? []) as Rule[];
}

export async function fetchAllRules(): Promise<Rule[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("rules")
    .select("*")
    .order("is_active", { ascending: false })
    .order("priority", { ascending: true });
  return (data ?? []) as Rule[];
}

export async function fetchMacroGoals(): Promise<MacroGoal[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("macro_goals")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as MacroGoal[];
}

export async function fetchOrCreateTodayPlan(): Promise<DailyPlan | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const today = formatDateISO();
  const { data: existing } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("plan_date", today)
    .maybeSingle();
  if (existing) return existing as DailyPlan;
  const { data: created } = await supabase
    .from("daily_plans")
    .insert({ user_id: user.id, plan_date: today })
    .select("*")
    .single();
  return (created as DailyPlan) ?? null;
}

export async function fetchTasksForPlan(planId: string): Promise<Task[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("daily_plan_id", planId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Task[];
}

export async function fetchUnresolvedJournalToday(planId: string): Promise<PointedJournal[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("pointed_journal")
    .select("*")
    .eq("daily_plan_id", planId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PointedJournal[];
}

export async function fetchSuccessRate(days = 14): Promise<{ rate: number; done: number; missed: number }> {
  const supabase = createSupabaseServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const { data } = await supabase
    .from("tasks")
    .select("status, created_at")
    .gte("created_at", sinceISO);

  let done = 0;
  let missed = 0;
  for (const row of data ?? []) {
    if (row.status === "done") done++;
    else if (row.status === "missed") missed++;
  }
  const total = done + missed;
  return { rate: total === 0 ? 0 : done / total, done, missed };
}

export async function fetchRecentContext(days = 7) {
  const supabase = createSupabaseServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const [plans, tasks, journal, rules, goals, runs] = await Promise.all([
    supabase
      .from("daily_plans")
      .select("*")
      .gte("plan_date", sinceDate)
      .order("plan_date", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("pointed_journal")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true }),
    supabase.from("rules").select("*").eq("is_active", true).order("priority"),
    supabase.from("macro_goals").select("*").order("sort_order"),
    supabase
      .from("analysis_runs")
      .select("*")
      .gte("run_date", sinceDate)
      .order("run_date", { ascending: true }),
  ]);

  return {
    plans: (plans.data ?? []) as DailyPlan[],
    tasks: (tasks.data ?? []) as Task[],
    journal: (journal.data ?? []) as PointedJournal[],
    rules: (rules.data ?? []) as Rule[],
    goals: (goals.data ?? []) as MacroGoal[],
    runs: (runs.data ?? []) as AnalysisRun[],
  };
}
