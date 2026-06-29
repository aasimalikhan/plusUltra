"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import type { FocusSessionStatus, FocusSessionType } from "@/lib/db-types";

function parseTimestamp(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function logFocusSession(input: {
  intention: string;
  plannedDurationSeconds: number;
  focusedSeconds: number;
  status: FocusSessionStatus;
  startedAt: string;
  endedAt: string;
  sessionType?: FocusSessionType;
}) {
  const intention = input.intention.trim();
  if (!intention) return { ok: false as const, error: "Empty intention" };

  const planned = Math.round(input.plannedDurationSeconds);
  if (!Number.isFinite(planned) || planned <= 0) {
    return { ok: false as const, error: "Invalid planned duration" };
  }

  const focused = Math.round(input.focusedSeconds);
  if (!Number.isFinite(focused) || focused < 0) {
    return { ok: false as const, error: "Invalid focused duration" };
  }
  if (input.status === "completed" && focused <= 0) {
    return { ok: false as const, error: "Completed sessions must log focused time" };
  }
  if (focused > planned) {
    return { ok: false as const, error: "Focused time cannot exceed planned duration" };
  }

  const startedAt = parseTimestamp(input.startedAt);
  const endedAt = parseTimestamp(input.endedAt);
  if (!startedAt || !endedAt) {
    return { ok: false as const, error: "Invalid session timestamps" };
  }
  if (endedAt.getTime() < startedAt.getTime()) {
    return { ok: false as const, error: "Session end time is before start time" };
  }

  const sessionType = input.sessionType === "void" ? "void" : "deep_work";

  const { supabase, userId } = await getServerDb();
  const { error } = await supabase.from("focus_sessions").insert({
    user_id: userId,
    intention,
    planned_duration_seconds: planned,
    focused_seconds: focused,
    status: input.status,
    session_type: sessionType,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
  });
  if (error) {
    if (/focus_sessions|schema cache|does not exist/i.test(error.message)) {
      return {
        ok: false as const,
        error: "Focus log table missing — run migration 0010_focus_sessions.sql",
      };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/focus");
  return { ok: true as const };
}
