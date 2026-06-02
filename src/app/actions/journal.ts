"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import { formatDateISO } from "@/lib/utils";
import { ensureTomorrowRepairTask } from "@/lib/tomorrow-tasks";

export interface JournalInput {
  trigger_event: string;
  automatic_thought?: string;
  emotional_impact?: number;
  system_repair: string;
  long_term_damage?: string;
  related_task_id?: string | null;
}

export async function logPointedJournal(input: JournalInput) {
  const { supabase, userId } = await getServerDb();

  const planDate = formatDateISO();
  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();

  const { error } = await supabase.from("pointed_journal").insert({
    user_id: userId,
    daily_plan_id: plan?.id ?? null,
    related_task_id: input.related_task_id ?? null,
    trigger_event: input.trigger_event,
    automatic_thought: input.automatic_thought ?? null,
    emotional_impact: input.emotional_impact ?? null,
    system_repair: input.system_repair,
    long_term_damage: input.long_term_damage ?? null,
  });
  if (error) throw new Error(error.message);

  let macroGoalId: string | null = null;
  if (input.related_task_id) {
    const { data: task } = await supabase
      .from("tasks")
      .select("macro_goal_id")
      .eq("id", input.related_task_id)
      .eq("user_id", userId)
      .maybeSingle();
    macroGoalId = (task?.macro_goal_id as string | null) ?? null;
  }
  if (!macroGoalId) {
    const { data: fallback } = await supabase
      .from("macro_goals")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", "INTELLIGENT")
      .maybeSingle();
    macroGoalId = (fallback?.id as string | null) ?? null;
  }

  await ensureTomorrowRepairTask(supabase, userId, {
    task_name: input.system_repair,
    macro_goal_id: macroGoalId,
  });

  revalidatePath("/today");
  revalidatePath("/history");
}

export async function resolveJournalEntry(id: string, resolved: boolean) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("pointed_journal")
    .update({ is_resolved: resolved })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/history");
}
