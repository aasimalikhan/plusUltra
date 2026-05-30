export type TaskStatus = "pending" | "done" | "missed";
export type TaskSource = "manual" | "cursor";
/** Uppercase slug stored on macro_goals (built-in or custom). */
export type MacroGoalSlug = string;

export interface MacroGoal {
  id: string;
  user_id: string;
  slug: MacroGoalSlug;
  title: string;
  visual_anchor_url: string | null;
  deadline: string | null;
  sort_order: number;
  created_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  is_locked: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  daily_plan_id: string;
  macro_goal_id: string | null;
  task_name: string;
  status: TaskStatus;
  completed_at: string | null;
  source: TaskSource;
  created_at: string;
}

export interface PointedJournal {
  id: string;
  user_id: string;
  daily_plan_id: string | null;
  related_task_id: string | null;
  trigger_event: string;
  automatic_thought: string | null;
  emotional_impact: number | null;
  identified_schema: string | null;
  system_repair: string;
  long_term_damage: string | null;
  is_resolved: boolean;
  created_at: string;
}

export interface Rule {
  id: string;
  user_id: string;
  rule_text: string;
  is_active: boolean;
  priority: number;
  last_relevant_at: string;
  created_at: string;
}

export interface AnalysisRun {
  id: string;
  user_id: string;
  run_date: string;
  cited_journal_ids: string[];
  cited_task_ids: string[];
  cursor_raw_input: unknown;
  cursor_raw_output: unknown;
  summary: string | null;
  created_at: string;
}

export interface CursorPlan {
  summary: string;
  cited_journal_ids?: string[];
  cited_task_ids?: string[];
  tomorrow_tasks: Array<{
    macro_goal_slug: MacroGoalSlug;
    task_name: string;
  }>;
  rule_changes?: {
    add?: Array<{ rule_text: string; priority?: number }>;
    demote?: Array<{ id: string; priority: number }>;
    deactivate?: string[];
  };
}
