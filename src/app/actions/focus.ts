"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import type { FocusSessionStatus } from "@/lib/db-types";

export async function logFocusSession(input: {
  intention: string;
  plannedDurationSeconds: number;
  focusedSeconds: number;
  status: FocusSessionStatus;
  startedAt: string;
  endedAt: string;
}) {
  const intention = input.intention.trim();
  if (!intention) return { ok: false as const, error: "Empty intention" };
  if (input.plannedDurationSeconds <= 0) {
    return { ok: false as const, error: "Invalid planned duration" };
  }
  if (input.focusedSeconds < 0) {
    return { ok: false as const, error: "Invalid focused duration" };
  }

  const { supabase, userId } = await getServerDb();
  const { error } = await supabase.from("focus_sessions").insert({
    user_id: userId,
    intention,
    planned_duration_seconds: input.plannedDurationSeconds,
    focused_seconds: input.focusedSeconds,
    status: input.status,
    started_at: input.startedAt,
    ended_at: input.endedAt,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/focus");
  return { ok: true as const };
}
