"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import type { TaskCategory } from "@/lib/db-types";

export async function fetchTaskTemplatesAction() {
  const { supabase, userId } = await getServerDb();
  const { data } = await supabase
    .from("task_templates")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  return data ?? [];
}

export async function addTaskTemplate(formData: FormData) {
  const { supabase, userId } = await getServerDb();
  const task_name = String(formData.get("task_name") ?? "").trim();
  const macro_goal_id = String(formData.get("macro_goal_id") ?? "") || null;
  const category = (String(formData.get("category") ?? "personal") as TaskCategory) || "personal";
  if (!task_name) return;

  const { data: maxRow } = await supabase
    .from("task_templates")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("task_templates").insert({
    user_id: userId,
    macro_goal_id,
    task_name,
    category,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/manage");
  revalidatePath("/today");
}

export async function updateTaskTemplate(
  id: string,
  updates: Partial<{
    task_name: string;
    macro_goal_id: string | null;
    category: TaskCategory;
    is_active: boolean;
    sort_order: number;
  }>,
) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("task_templates")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/manage");
  revalidatePath("/today");
}

export async function deleteTaskTemplate(id: string) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("task_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/manage");
}

export async function saveWorkContext(formData: FormData) {
  const { supabase, userId } = await getServerDb();
  const work_context = String(formData.get("work_context") ?? "").trim() || null;
  const { error } = await supabase
    .from("profiles")
    .update({ work_context })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/manage");
  revalidatePath("/cursor");
}
