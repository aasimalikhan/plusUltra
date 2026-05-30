"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";

export async function addRule(formData: FormData) {
  const { supabase, userId } = await getServerDb();

  const rule_text = String(formData.get("rule_text") ?? "").trim();
  const priority = Number(formData.get("priority") ?? 100);
  if (!rule_text) return;

  const { error } = await supabase.from("rules").insert({
    user_id: userId,
    rule_text,
    priority,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/rules");
  revalidatePath("/today");
}

export async function updateRule(
  id: string,
  patch: { rule_text?: string; priority?: number; is_active?: boolean },
) {
  const { supabase, userId } = await getServerDb();
  const update: Record<string, unknown> = { ...patch };
  if (patch.rule_text !== undefined || patch.is_active === true) {
    update.last_relevant_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("rules")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/rules");
  revalidatePath("/today");
}

export async function deleteRule(id: string) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("rules")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/rules");
  revalidatePath("/today");
}

export async function shiftRulePriority(id: string, delta: number) {
  const { supabase, userId } = await getServerDb();
  const { data: current } = await supabase
    .from("rules")
    .select("priority")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!current) return;
  const nextPriority = Math.max(1, (current.priority ?? 100) + delta);
  await supabase
    .from("rules")
    .update({ priority: nextPriority })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/rules");
  revalidatePath("/today");
}
