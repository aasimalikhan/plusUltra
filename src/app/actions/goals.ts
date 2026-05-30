"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import { normalizeSlugInput, slugFromTitle } from "@/lib/macro-goal-ui";

export async function updateGoal(
  id: string,
  patch: {
    title?: string;
    visual_anchor_url?: string | null;
    deadline?: string | null;
  },
) {
  const { supabase, userId } = await getServerDb();
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.visual_anchor_url !== undefined)
    update.visual_anchor_url = patch.visual_anchor_url || null;
  if (patch.deadline !== undefined) update.deadline = patch.deadline || null;
  const { error } = await supabase
    .from("macro_goals")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/today");
  revalidatePath("/cursor");
}

export async function addMacroGoal(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return "Title must be at least 2 characters.";

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = slugRaw ? normalizeSlugInput(slugRaw) : slugFromTitle(title);
  if (slug.length < 2) return "Slug must be at least 2 characters (A–Z, 0–9, _).";

  const { supabase, userId } = await getServerDb();

  const { data: maxRow } = await supabase
    .from("macro_goals")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("macro_goals").insert({
    user_id: userId,
    slug,
    title,
    sort_order,
  });

  if (error) {
    if (error.code === "23505") return `Slug "${slug}" is already in use.`;
    return error.message;
  }

  revalidatePath("/goals");
  revalidatePath("/today");
  revalidatePath("/cursor");
  return null;
}

export async function deleteMacroGoal(id: string): Promise<string | null> {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("macro_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return error.message;
  revalidatePath("/goals");
  revalidatePath("/today");
  revalidatePath("/cursor");
  revalidatePath("/history");
  return null;
}
