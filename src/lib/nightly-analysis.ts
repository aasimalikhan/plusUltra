import type { SupabaseClient } from "@supabase/supabase-js";
import { isGeminiConfigured } from "@/lib/analysis-env";
import {
  buildCursorContextMarkdown,
  buildCursorFullPayload,
} from "@/lib/context-formatter";
import { getAnalysisProvider } from "@/lib/analysis-providers";
import {
  parseAndValidateCursorPlan,
  validateCursorPlan,
} from "@/lib/cursor-plan-validation";
import { callGeminiAnalysis } from "@/lib/gemini-analysis";
import {
  fetchRecentContextForUser,
  hasAnalysisRunOnDate,
} from "@/lib/queries";
import { formatDateISOInTz, tomorrowDateISOInTz } from "@/lib/timezone";
import type { CursorPlan } from "@/lib/db-types";

export type NightlyAnalysisResult =
  | {
      ok: true;
      runId: string;
      tasksCreated: number;
      summary: string;
      skipped?: false;
    }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

async function loadAllowedSlugs(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data: goals } = await supabase
    .from("macro_goals")
    .select("slug")
    .eq("user_id", userId);
  return new Set((goals ?? []).map((g) => g.slug as string));
}

/** Force-lock today's plan and mark pending tasks as missed (for midnight cron). */
export async function forceLockTodayForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const today = formatDateISOInTz();
  const { data: todayPlan } = await supabase
    .from("daily_plans")
    .select("id, is_locked")
    .eq("user_id", userId)
    .eq("plan_date", today)
    .maybeSingle();

  if (!todayPlan || todayPlan.is_locked) return 0;

  const { data: missed } = await supabase
    .from("tasks")
    .update({ status: "missed" })
    .eq("daily_plan_id", todayPlan.id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id");

  await supabase
    .from("daily_plans")
    .update({ is_locked: true })
    .eq("id", todayPlan.id)
    .eq("user_id", userId);

  return missed?.length ?? 0;
}

export async function clearDayCapturesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase.from("day_captures").delete().eq("user_id", userId);
}

export async function applyPlanForUser(
  supabase: SupabaseClient,
  userId: string,
  opts: {
    rawInputMarkdown: string;
    rawOutputText: string;
    provider: "cursor" | "gemini" | "chatgpt";
    runDate?: string;
  },
): Promise<{ ok: true; runId: string; tasksCreated: number } | { ok: false; error: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(opts.rawOutputText);
  } catch (err) {
    return { ok: false, error: `Could not parse JSON: ${(err as Error).message}` };
  }

  const allowedSlugs = await loadAllowedSlugs(supabase, userId);
  const v = validateCursorPlan(parsed, allowedSlugs);
  if (!v.ok) return { ok: false, error: v.error };
  const plan = v.plan;

  const tomorrowISO = tomorrowDateISOInTz();
  const runDate = opts.runDate ?? formatDateISOInTz();

  const { data: planRow, error: planErr } = await supabase
    .from("daily_plans")
    .upsert(
      { user_id: userId, plan_date: tomorrowISO },
      { onConflict: "user_id,plan_date" },
    )
    .select("id")
    .single();
  if (planErr || !planRow) return { ok: false, error: planErr?.message ?? "no plan" };

  const { data: goalsFull } = await supabase
    .from("macro_goals")
    .select("id, slug")
    .eq("user_id", userId);
  const slugToId = new Map((goalsFull ?? []).map((g) => [g.slug, g.id] as const));

  const taskInserts = plan.tomorrow_tasks
    .map((t) => ({
      user_id: userId,
      daily_plan_id: planRow.id,
      macro_goal_id: slugToId.get(String(t.macro_goal_slug).toUpperCase()) ?? null,
      task_name: t.task_name.trim(),
      source: "cursor" as const,
      category: t.category === "work" ? "work" : "personal",
    }))
    .filter((t) => t.task_name.length > 0);

  let tasksCreated = 0;
  if (taskInserts.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from("tasks")
      .insert(taskInserts)
      .select("id");
    if (insErr) return { ok: false, error: `tasks insert failed: ${insErr.message}` };
    tasksCreated = inserted?.length ?? 0;
  }

  const rc = plan.rule_changes ?? {};
  if (rc.add && rc.add.length > 0) {
    await supabase.from("rules").insert(
      rc.add.map((r) => ({
        user_id: userId,
        rule_text: r.rule_text,
        priority: r.priority ?? 100,
        last_relevant_at: new Date().toISOString(),
      })),
    );
  }
  if (rc.demote) {
    for (const d of rc.demote) {
      await supabase
        .from("rules")
        .update({ priority: d.priority })
        .eq("id", d.id)
        .eq("user_id", userId);
    }
  }
  if (rc.deactivate && rc.deactivate.length > 0) {
    await supabase
      .from("rules")
      .update({ is_active: false })
      .in("id", rc.deactivate)
      .eq("user_id", userId);
  }

  const { data: run, error: runErr } = await supabase
    .from("analysis_runs")
    .insert({
      user_id: userId,
      run_date: runDate,
      cited_journal_ids: plan.cited_journal_ids ?? [],
      cited_task_ids: plan.cited_task_ids ?? [],
      cursor_raw_input: { markdown: opts.rawInputMarkdown },
      cursor_raw_output: plan,
      summary: plan.summary,
      provider: opts.provider,
    })
    .select("id")
    .single();
  if (runErr) return { ok: false, error: `analysis_runs insert failed: ${runErr.message}` };

  await clearDayCapturesForUser(supabase, userId);

  return { ok: true, runId: run!.id, tasksCreated };
}

export async function generateGeminiPlanForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  | { ok: true; plan: CursorPlan; rawOutputText: string; rawInputMarkdown: string }
  | { ok: false; error: string }
> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      error:
        "GEMINI_API_KEY is not configured. Add it to .env.local and restart the server.",
    };
  }

  try {
    const [bundle, allowedSlugs] = await Promise.all([
      fetchRecentContextForUser(supabase, userId, 7),
      loadAllowedSlugs(supabase, userId),
    ]);
    const rawInputMarkdown = buildCursorContextMarkdown(bundle);
    const payload = buildCursorFullPayload(
      bundle,
      getAnalysisProvider("gemini").providerNote || undefined,
    );

    const rawOutputText = await callGeminiAnalysis(payload);
    const validated = parseAndValidateCursorPlan(rawOutputText, allowedSlugs);
    if (!validated.ok) {
      return {
        ok: false,
        error: `Gemini response failed validation: ${validated.error}`,
      };
    }

    return {
      ok: true,
      plan: validated.plan,
      rawOutputText,
      rawInputMarkdown,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gemini analysis failed",
    };
  }
}

/** Full nightly pipeline: lock day → Gemini → apply plan → clear captures. One run per calendar day. */
export async function runNightlyAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  opts?: { skipIfAlreadyRun?: boolean; forceLock?: boolean },
): Promise<NightlyAnalysisResult> {
  const runDate = formatDateISOInTz();

  if (opts?.skipIfAlreadyRun !== false) {
    const already = await hasAnalysisRunOnDate(supabase, userId, runDate);
    if (already) {
      return { ok: true, skipped: true, reason: "Analysis already ran today" };
    }
  }

  if (opts?.forceLock !== false) {
    await forceLockTodayForUser(supabase, userId);
  }

  const generated = await generateGeminiPlanForUser(supabase, userId);
  if (!generated.ok) return { ok: false, error: generated.error };

  const applied = await applyPlanForUser(supabase, userId, {
    rawInputMarkdown: generated.rawInputMarkdown,
    rawOutputText: generated.rawOutputText,
    provider: "gemini",
    runDate,
  });
  if (!applied.ok) return { ok: false, error: applied.error };

  return {
    ok: true,
    runId: applied.runId,
    tasksCreated: applied.tasksCreated,
    summary: generated.plan.summary,
  };
}
