"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";

export async function addDayCapture(content: string) {
  const text = content.trim();
  if (!text) return { ok: false as const, error: "Empty capture" };

  const { supabase, userId } = await getServerDb();
  const { error } = await supabase.from("day_captures").insert({
    user_id: userId,
    content: text,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/captures");
  revalidatePath("/cursor");
  revalidatePath("/today");
  return { ok: true as const };
}

export async function deleteDayCapture(id: string) {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("day_captures")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/captures");
  revalidatePath("/cursor");
  return { ok: true as const };
}

export async function clearAllDayCaptures() {
  const { supabase, userId } = await getServerDb();
  const { error } = await supabase
    .from("day_captures")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/captures");
  revalidatePath("/cursor");
  return { ok: true as const };
}
