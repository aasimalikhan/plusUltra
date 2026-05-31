"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import type { DeadlineGoalStatus } from "@/lib/db-types";

function revalidateDeadlinePaths() {
  revalidatePath("/deadlines");
  revalidatePath("/today");
  revalidatePath("/cursor");
}

export async function addDeadlineGoal(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const title = String(formData.get("title") ?? "").trim();
  const target_date = String(formData.get("target_date") ?? "").trim();
  const importance = Number(formData.get("importance") ?? 3);
  const macro_goal_id = String(formData.get("macro_goal_id") ?? "") || null;
  const implementation_notes =
    String(formData.get("implementation_notes") ?? "").trim() || null;

  if (title.length < 2) return "Title must be at least 2 characters.";
  if (!target_date) return "Target date is required.";
  if (importance < 1 || importance > 5) return "Importance must be 1–5.";

  const { supabase, userId } = await getServerDb();

  const { data: maxRow } = await supabase
    .from("deadline_goals")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("deadline_goals").insert({
    user_id: userId,
    title,
    target_date,
    importance,
    macro_goal_id,
    implementation_notes,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  });

  if (error) return error.message;
  revalidateDeadlinePaths();
  return null;
}

export async function updateDeadlineGoal(
  id: string,
  patch: {
    title?: string;
    target_date?: string;
    importance?: number;
    macro_goal_id?: string | null;
    implementation_notes?: string | null;
    status?: DeadlineGoalStatus;
  },
) {
  const { supabase, userId } = await getServerDb();
  const update: Record<string, unknown> = {};

  if (patch.title !== undefined) update.title = patch.title;
  if (patch.target_date !== undefined) update.target_date = patch.target_date;
  if (patch.importance !== undefined) update.importance = patch.importance;
  if (patch.macro_goal_id !== undefined) update.macro_goal_id = patch.macro_goal_id;
  if (patch.implementation_notes !== undefined)
    update.implementation_notes = patch.implementation_notes;
  if (patch.status !== undefined) {
    update.status = patch.status;
    update.completed_at =
      patch.status === "completed" ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from("deadline_goals")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDeadlinePaths();
}

export async function deleteDeadlineGoal(id: string): Promise<string | null> {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("deadline_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return error.message;
  revalidateDeadlinePaths();
  return null;
}

export async function addDeadlineMilestone(deadlineGoalId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const { supabase, userId } = await getServerDb();

  const { data: maxRow } = await supabase
    .from("deadline_milestones")
    .select("sort_order")
    .eq("deadline_goal_id", deadlineGoalId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("deadline_milestones").insert({
    user_id: userId,
    deadline_goal_id: deadlineGoalId,
    title: trimmed,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
  revalidateDeadlinePaths();
}

export async function toggleDeadlineMilestone(milestoneId: string, isDone: boolean) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("deadline_milestones")
    .update({
      is_done: isDone,
      completed_at: isDone ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDeadlinePaths();
}

export async function deleteDeadlineMilestone(milestoneId: string) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("deadline_milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDeadlinePaths();
}
