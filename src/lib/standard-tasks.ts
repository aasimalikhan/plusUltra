import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateISO } from "@/lib/utils";
import type { TaskCategory, TaskTemplate } from "@/lib/db-types";

export const DEFAULT_STANDARD_TASKS: Array<{
  task_name: string;
  slug: "RICH" | "MUSCULAR" | "INTELLIGENT";
  category: TaskCategory;
  sort_order: number;
}> = [
  { task_name: "Studied System Design", slug: "RICH", category: "personal", sort_order: 0 },
  { task_name: "Solved DSA", slug: "RICH", category: "personal", sort_order: 1 },
  { task_name: "Studied Financial Planning", slug: "RICH", category: "personal", sort_order: 2 },
  { task_name: "Hit the gym", slug: "MUSCULAR", category: "personal", sort_order: 3 },
  { task_name: "Diet", slug: "MUSCULAR", category: "personal", sort_order: 4 },
  { task_name: "Pointed Journaling", slug: "INTELLIGENT", category: "personal", sort_order: 5 },
  { task_name: "Read Book", slug: "INTELLIGENT", category: "personal", sort_order: 6 },
];

/** Seed default templates if user has none. */
export async function ensureDefaultTaskTemplates(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("task_templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return false;

  const { data: goals } = await supabase
    .from("macro_goals")
    .select("id, slug")
    .eq("user_id", userId);

  const slugToId = new Map((goals ?? []).map((g) => [g.slug, g.id] as const));

  const rows = DEFAULT_STANDARD_TASKS.map((t) => ({
    user_id: userId,
    macro_goal_id: slugToId.get(t.slug) ?? null,
    task_name: t.task_name,
    category: t.category,
    sort_order: t.sort_order,
    is_active: true,
  }));

  const { error } = await supabase.from("task_templates").insert(rows);
  return !error;
}

/** Add any missing active templates to today's plan. */
export async function ensureStandardTasksForPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
): Promise<number> {
  const { data: templates } = await supabase
    .from("task_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order");

  if (!templates?.length) return 0;

  const { data: existing } = await supabase
    .from("tasks")
    .select("task_name")
    .eq("user_id", userId)
    .eq("daily_plan_id", planId);

  const existingNames = new Set(
    (existing ?? []).map((t) => t.task_name.trim().toLowerCase()),
  );

  const toInsert = (templates as TaskTemplate[])
    .filter((t) => !existingNames.has(t.task_name.trim().toLowerCase()))
    .map((t) => ({
      user_id: userId,
      daily_plan_id: planId,
      macro_goal_id: t.macro_goal_id,
      task_name: t.task_name,
      category: t.category,
      source: "standard" as const,
    }));

  if (toInsert.length === 0) return 0;

  let { data: inserted, error } = await supabase
    .from("tasks")
    .insert(toInsert)
    .select("id");

  if (error && /category|standard|schema cache/i.test(error.message)) {
    ({ data: inserted, error } = await supabase
      .from("tasks")
      .insert(
        toInsert.map(({ category: _c, source: _s, ...row }) => ({
          ...row,
          source: "manual" as const,
        })),
      )
      .select("id"));
  }

  if (error) {
    console.error("ensureStandardTasksForPlan failed", error);
    return 0;
  }
  return inserted?.length ?? 0;
}

export async function ensureTodayStandardTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  await ensureDefaultTaskTemplates(supabase, userId);

  const today = formatDateISO();
  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id, is_locked")
    .eq("user_id", userId)
    .eq("plan_date", today)
    .maybeSingle();

  if (!plan || plan.is_locked) return 0;
  return ensureStandardTasksForPlan(supabase, userId, plan.id);
}
