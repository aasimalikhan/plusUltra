"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateGoal(
  id: string,
  patch: { title?: string; visual_anchor_url?: string | null; deadline?: string | null },
) {
  const supabase = createSupabaseServerClient();
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.visual_anchor_url !== undefined)
    update.visual_anchor_url = patch.visual_anchor_url || null;
  if (patch.deadline !== undefined) update.deadline = patch.deadline || null;
  const { error } = await supabase.from("macro_goals").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/today");
}
