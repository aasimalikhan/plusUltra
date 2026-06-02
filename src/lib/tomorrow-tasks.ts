import type { SupabaseClient } from "@supabase/supabase-js";
import { tomorrowDateISO } from "@/lib/utils";

/** Insert a repair action as tomorrow's task if not already present. */
export async function ensureTomorrowRepairTask(
  supabase: SupabaseClient,
  userId: string,
  opts: {
    task_name: string;
    macro_goal_id: string | null;
  },
): Promise<boolean> {
  const name = opts.task_name.trim();
  if (!name) return false;

  const tomorrowISO = tomorrowDateISO();

  const { data: plan, error: planErr } = await supabase
    .from("daily_plans")
    .upsert(
      { user_id: userId, plan_date: tomorrowISO },
      { onConflict: "user_id,plan_date" },
    )
    .select("id")
    .single();
  if (planErr || !plan) return false;

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, task_name")
    .eq("user_id", userId)
    .eq("daily_plan_id", plan.id);

  const normalized = name.toLowerCase();
  const duplicate = (existing ?? []).some(
    (t) => t.task_name.trim().toLowerCase() === normalized,
  );
  if (duplicate) return false;

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    daily_plan_id: plan.id,
    macro_goal_id: opts.macro_goal_id,
    task_name: name,
    source: "manual",
  });
  return !error;
}
