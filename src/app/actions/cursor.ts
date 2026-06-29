"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import { isGeminiConfigured } from "@/lib/analysis-env";
import {
  buildCursorContextMarkdown,
  buildCursorFullPayload,
} from "@/lib/context-formatter";
import { getAnalysisProvider } from "@/lib/analysis-providers";
import { parseCursorPlanJson } from "@/lib/cursor-plan-validation";
import { clearTodayAnalysisState } from "@/lib/analysis-reset";
import { hasAnalysisRunToday } from "@/lib/queries";
import {
  applyPlanForUser,
  generateGeminiPlanForUser,
  runNightlyAnalysisForUser,
} from "@/lib/nightly-analysis";
import type { CursorPlan } from "@/lib/db-types";

export type GeminiAnalysisResult =
  | {
      ok: true;
      plan: CursorPlan;
      rawOutputText: string;
      rawInputMarkdown: string;
    }
  | { ok: false; error: string };

export async function generateGeminiAnalysis(): Promise<GeminiAnalysisResult> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      error:
        "GEMINI_API_KEY is not configured. Add it to .env.local and restart the dev server.",
    };
  }

  if (await hasAnalysisRunToday()) {
    return {
      ok: false,
      error: "Analysis already ran today. One Gemini call per day — check /insights or wait until tomorrow.",
    };
  }

  const { supabase, userId } = await getServerDb();
  const generated = await generateGeminiPlanForUser(supabase, userId);
  return generated;
}

export async function generateAndApplyGeminiAnalysis(): Promise<{
  ok: boolean;
  error?: string;
  runId?: string;
  tasksCreated?: number;
}> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      error:
        "GEMINI_API_KEY is not configured. Add it to .env.local and restart the dev server.",
    };
  }

  const { supabase, userId } = await getServerDb();
  const result = await runNightlyAnalysisForUser(supabase, userId, {
    skipIfAlreadyRun: true,
    forceLock: false,
  });

  if (!result.ok) return { ok: false, error: result.error };
  if (result.skipped) return { ok: false, error: result.reason };

  revalidateAnalysisPaths();

  return {
    ok: true,
    runId: result.runId,
    tasksCreated: result.tasksCreated,
  };
}

export async function applyCursorPlan(opts: {
  rawInputMarkdown: string;
  rawOutputText: string;
  provider?: "cursor" | "gemini" | "chatgpt";
}): Promise<{ ok: boolean; error?: string; runId?: string; tasksCreated?: number }> {
  if (await hasAnalysisRunToday()) {
    return {
      ok: false,
      error: "Analysis already ran today. One run per day — edit tomorrow on /today if needed.",
    };
  }

  const parsed = parseCursorPlanJson(opts.rawOutputText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { supabase, userId } = await getServerDb();
  const applied = await applyPlanForUser(supabase, userId, {
    rawInputMarkdown: opts.rawInputMarkdown,
    rawOutputText: JSON.stringify(parsed.parsed),
    provider: opts.provider ?? "cursor",
  });
  if (!applied.ok) return applied;

  revalidateAnalysisPaths();

  return applied;
}

/** Manual trigger — same pipeline as midnight cron, for testing or catch-up. */
export async function triggerNightlyAnalysisNow(): Promise<{
  ok: boolean;
  error?: string;
  runId?: string;
  tasksCreated?: number;
  skipped?: boolean;
  reason?: string;
}> {
  if (!isGeminiConfigured()) {
    return { ok: false, error: "GEMINI_API_KEY is not configured." };
  }

  const { supabase, userId } = await getServerDb();
  const result = await runNightlyAnalysisForUser(supabase, userId, {
    skipIfAlreadyRun: true,
    midnightBoundary: true,
  });

  if (!result.ok) return { ok: false, error: result.error };
  if (result.skipped) {
    return { ok: true, skipped: true, reason: result.reason };
  }

  revalidateAnalysisPaths();

  return {
    ok: true,
    runId: result.runId,
    tasksCreated: result.tasksCreated,
  };
}

/**
 * Dev / iteration: delete today's analysis run + cursor tasks, then rerun Gemini
 * and apply fresh tasks to **today's** plan (IST calendar day).
 */
export async function resetTodayAnalysisAndRerun(): Promise<{
  ok: boolean;
  error?: string;
  runId?: string;
  tasksCreated?: number;
  runsDeleted?: number;
  cursorTasksDeleted?: number;
}> {
  if (!isGeminiConfigured()) {
    return { ok: false, error: "GEMINI_API_KEY is not configured." };
  }

  const { supabase, userId } = await getServerDb();
  const cleared = await clearTodayAnalysisState(supabase, userId);

  const result = await runNightlyAnalysisForUser(supabase, userId, {
    skipIfAlreadyRun: false,
    forceLock: false,
    applyToToday: true,
  });

  if (!result.ok) return { ok: false, error: result.error };
  if (result.skipped) {
    return { ok: false, error: result.reason ?? "Analysis was skipped after reset" };
  }

  revalidateAnalysisPaths();

  return {
    ok: true,
    runId: result.runId,
    tasksCreated: result.tasksCreated,
    runsDeleted: cleared.runsDeleted,
    cursorTasksDeleted: cleared.cursorTasksDeleted,
  };
}

function revalidateAnalysisPaths() {
  revalidatePath("/today");
  revalidatePath("/rules");
  revalidatePath("/history");
  revalidatePath("/cursor");
  revalidatePath("/deadlines");
  revalidatePath("/captures");
  revalidatePath("/insights");
}

export async function previewAnalysisPayload(): Promise<string> {
  const { supabase, userId } = await getServerDb();
  const { fetchRecentContextForUser } = await import("@/lib/queries");
  const bundle = await fetchRecentContextForUser(supabase, userId, 7);
  return buildCursorFullPayload(
    bundle,
    getAnalysisProvider("gemini").providerNote || undefined,
  );
}

export async function previewAnalysisMarkdown(): Promise<string> {
  const { supabase, userId } = await getServerDb();
  const { fetchRecentContextForUser } = await import("@/lib/queries");
  const bundle = await fetchRecentContextForUser(supabase, userId, 7);
  return buildCursorContextMarkdown(bundle);
}
