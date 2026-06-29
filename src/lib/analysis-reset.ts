import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateISOInTz } from "@/lib/timezone";

/**
 * Remove today's analysis audit row and AI-generated tasks so you can rerun Gemini.
 * Does not revert rule_changes from a prior apply — edit rules on /manage if needed.
 */
export async function clearTodayAnalysisState(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ runsDeleted: number; cursorTasksDeleted: number }> {
  const today = formatDateISOInTz();

  const { data: deletedRuns } = await supabase
    .from("analysis_runs")
    .delete()
    .eq("user_id", userId)
    .eq("run_date", today)
    .select("id");

  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_date", today)
    .maybeSingle();

  let cursorTasksDeleted = 0;
  if (plan) {
    const { data: deletedTasks } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", userId)
      .eq("daily_plan_id", plan.id)
      .eq("source", "cursor")
      .select("id");
    cursorTasksDeleted = deletedTasks?.length ?? 0;
  }

  return {
    runsDeleted: deletedRuns?.length ?? 0,
    cursorTasksDeleted,
  };
}
