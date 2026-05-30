"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateISO } from "@/lib/utils";
import type { CursorPlan } from "@/lib/db-types";

function validatePlan(input: unknown): { ok: true; plan: CursorPlan } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "not an object" };
  const p = input as Record<string, unknown>;
  if (typeof p.summary !== "string") return { ok: false, error: "summary must be a string" };
  if (!Array.isArray(p.tomorrow_tasks))
    return { ok: false, error: "tomorrow_tasks must be an array" };
  for (const t of p.tomorrow_tasks) {
    if (!t || typeof t !== "object") return { ok: false, error: "tomorrow_tasks item not object" };
    const tt = t as Record<string, unknown>;
    if (!["RICH", "MUSCULAR", "INTELLIGENT"].includes(String(tt.macro_goal_slug)))
      return { ok: false, error: "bad macro_goal_slug" };
    if (typeof tt.task_name !== "string" || !tt.task_name.trim())
      return { ok: false, error: "missing task_name" };
  }
  return { ok: true, plan: p as unknown as CursorPlan };
}

export async function applyCursorPlan(opts: {
  rawInputMarkdown: string;
  rawOutputText: string;
}): Promise<{ ok: boolean; error?: string; runId?: string; tasksCreated?: number }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not signed in" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(opts.rawOutputText);
  } catch (err) {
    return { ok: false, error: `Could not parse JSON: ${(err as Error).message}` };
  }
  const v = validatePlan(parsed);
  if (!v.ok) return { ok: false, error: v.error };
  const plan = v.plan;

  // Resolve tomorrow's date + plan
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = formatDateISO(tomorrow);

  const { data: planRow, error: planErr } = await supabase
    .from("daily_plans")
    .upsert(
      { user_id: user.id, plan_date: tomorrowISO },
      { onConflict: "user_id,plan_date" },
    )
    .select("id")
    .single();
  if (planErr || !planRow) return { ok: false, error: planErr?.message ?? "no plan" };

  // Goals lookup by slug
  const { data: goals } = await supabase
    .from("macro_goals")
    .select("id, slug")
    .eq("user_id", user.id);
  const slugToId = new Map((goals ?? []).map((g) => [g.slug, g.id] as const));

  // Insert tomorrow's tasks (additive, doesn't wipe existing)
  const taskInserts = plan.tomorrow_tasks
    .map((t) => ({
      user_id: user.id,
      daily_plan_id: planRow.id,
      macro_goal_id: slugToId.get(t.macro_goal_slug) ?? null,
      task_name: t.task_name.trim(),
      source: "cursor" as const,
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

  // Apply rule changes
  const rc = plan.rule_changes ?? {};
  if (rc.add && rc.add.length > 0) {
    const ruleInserts = rc.add.map((r) => ({
      user_id: user.id,
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
        .eq("user_id", user.id);
    }
  }
  if (rc.deactivate && rc.deactivate.length > 0) {
    await supabase
      .from("rules")
      .update({ is_active: false })
      .in("id", rc.deactivate)
      .eq("user_id", user.id);
  }

  // Always write an analysis_runs row with raw input + raw output
  const { data: run, error: runErr } = await supabase
    .from("analysis_runs")
    .insert({
      user_id: user.id,
      run_date: formatDateISO(),
      cited_journal_ids: plan.cited_journal_ids ?? [],
      cited_task_ids: plan.cited_task_ids ?? [],
      cursor_raw_input: { markdown: opts.rawInputMarkdown },
      cursor_raw_output: plan,
      summary: plan.summary,
    })
    .select("id")
    .single();
  if (runErr) return { ok: false, error: `analysis_runs insert failed: ${runErr.message}` };

  revalidatePath("/today");
  revalidatePath("/rules");
  revalidatePath("/history");
  revalidatePath("/cursor");

  return { ok: true, runId: run?.id, tasksCreated };
}
