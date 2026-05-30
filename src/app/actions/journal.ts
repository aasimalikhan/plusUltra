"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateISO } from "@/lib/utils";

export interface JournalInput {
  trigger_event: string;
  automatic_thought?: string;
  emotional_impact?: number;
  system_repair: string;
  long_term_damage?: string;
  related_task_id?: string | null;
}

export async function logPointedJournal(input: JournalInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");

  const planDate = formatDateISO();
  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("plan_date", planDate)
    .maybeSingle();

  const { error } = await supabase.from("pointed_journal").insert({
    user_id: user.id,
    daily_plan_id: plan?.id ?? null,
    related_task_id: input.related_task_id ?? null,
    trigger_event: input.trigger_event,
    automatic_thought: input.automatic_thought ?? null,
    emotional_impact: input.emotional_impact ?? null,
    system_repair: input.system_repair,
    long_term_damage: input.long_term_damage ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/history");
}

export async function resolveJournalEntry(id: string, resolved: boolean) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("pointed_journal")
    .update({ is_resolved: resolved })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/history");
}
