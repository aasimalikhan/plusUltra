"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import { formatDateISO, isEvening } from "@/lib/utils";
import type { TaskStatus } from "@/lib/db-types";

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const { supabase, userId } = await getServerDb();
  const completed_at = status === "done" ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at })
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/history");
}

export async function addTaskToToday(formData: FormData) {
  const { supabase, userId } = await getServerDb();

  const task_name = String(formData.get("task_name") ?? "").trim();
  const macro_goal_id = String(formData.get("macro_goal_id") ?? "") || null;
  if (!task_name) return;

  const planDate = formatDateISO();
  const { data: plan, error: planErr } = await supabase
    .from("daily_plans")
    .upsert(
      { user_id: userId, plan_date: planDate },
      { onConflict: "user_id,plan_date" },
    )
    .select("id")
    .single();
  if (planErr || !plan) throw new Error(planErr?.message ?? "no plan");

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    daily_plan_id: plan.id,
    macro_goal_id,
    task_name,
    source: "manual",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/today");
}

export async function deleteTask(taskId: string) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
}

async function lockPlanAndMissPending(
  supabase: Awaited<ReturnType<typeof getServerDb>>["supabase"],
  userId: string,
  planId: string,
) {
  const { data: missed, error } = await supabase
    .from("tasks")
    .update({ status: "missed" })
    .eq("daily_plan_id", planId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id, task_name, macro_goal_id");
  if (error) throw new Error(error.message);

  const { error: lockErr } = await supabase
    .from("daily_plans")
    .update({ is_locked: true })
    .eq("id", planId)
    .eq("user_id", userId);
  if (lockErr) throw new Error(lockErr.message);

  return missed ?? [];
}

/** Flip pending → missed on any past unlocked day, then today after 11pm. */
export async function autoMarkOverdueAsMissed() {
  const { supabase, userId } = await getServerDb();
  const today = formatDateISO();
  const evening = isEvening();
  const allMissed: { id: string; task_name: string; macro_goal_id: string | null }[] = [];

  const { data: stalePlans } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("user_id", userId)
    .lt("plan_date", today)
    .eq("is_locked", false);

  for (const plan of stalePlans ?? []) {
    const missed = await lockPlanAndMissPending(supabase, userId, plan.id);
    allMissed.push(...missed);
  }

  if (evening) {
    const { data: todayPlan } = await supabase
      .from("daily_plans")
      .select("id, is_locked")
      .eq("user_id", userId)
      .eq("plan_date", today)
      .maybeSingle();

    if (todayPlan && !todayPlan.is_locked) {
      const missed = await lockPlanAndMissPending(supabase, userId, todayPlan.id);
      allMissed.push(...missed);
    }
  }

  if (allMissed.length > 0) revalidatePath("/today");
  revalidatePath("/history");
  return allMissed;
}

export async function addTaskToTomorrow(formData: FormData) {
  const { supabase, userId } = await getServerDb();
  const task_name = String(formData.get("task_name") ?? "").trim();
  const macro_goal_id = String(formData.get("macro_goal_id") ?? "") || null;
  if (!task_name) return;

  const { ensureTomorrowRepairTask } = await import("@/lib/tomorrow-tasks");
  await ensureTomorrowRepairTask(supabase, userId, { task_name, macro_goal_id });
  revalidatePath("/today");
}
