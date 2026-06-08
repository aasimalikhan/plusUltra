"use server";

import { revalidatePath } from "next/cache";
import { getServerDb } from "@/lib/db";
import { formatDateISO } from "@/lib/utils";
import type { CursorPlan } from "@/lib/db-types";
import { validateCursorPlan } from "@/lib/cursor-plan-validation";

export async function applyCursorPlan(opts: {
  rawInputMarkdown: string;
  rawOutputText: string;
  provider?: "cursor" | "gemini" | "chatgpt";
}): Promise<{ ok: boolean; error?: string; runId?: string; tasksCreated?: number }> {
  const { supabase, userId } = await getServerDb();

  let parsed: unknown;
  try {
    parsed = JSON.parse(opts.rawOutputText);
  } catch (err) {
    return { ok: false, error: `Could not parse JSON: ${(err as Error).message}` };
  }
  const { data: goals } = await supabase
    .from("macro_goals")
    .select("slug")
    .eq("user_id", userId);
  const allowedSlugs = new Set((goals ?? []).map((g) => g.slug as string));

  const v = validateCursorPlan(parsed, allowedSlugs);
  if (!v.ok) return { ok: false, error: v.error };
  const plan = v.plan;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = formatDateISO(tomorrow);

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
    const ruleInserts = rc.add.map((r) => ({
      user_id: userId,
      rule_text: r.rule_text,
      priority: r.priority ?? 100,
      last_relevant_at: new Date().toISOString(),
    }));
    await supabase.from("rules").insert(ruleInserts);
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
      run_date: formatDateISO(),
      cited_journal_ids: plan.cited_journal_ids ?? [],
      cited_task_ids: plan.cited_task_ids ?? [],
      cursor_raw_input: { markdown: opts.rawInputMarkdown },
      cursor_raw_output: plan,
      summary: plan.summary,
      provider: opts.provider ?? "cursor",
    })
    .select("id")
    .single();
  if (runErr) return { ok: false, error: `analysis_runs insert failed: ${runErr.message}` };

  revalidatePath("/today");
  revalidatePath("/rules");
  revalidatePath("/history");
  revalidatePath("/cursor");
  revalidatePath("/deadlines");

  return { ok: true, runId: run?.id, tasksCreated };
}
