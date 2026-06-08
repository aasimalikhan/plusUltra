export type TaskStatus = "pending" | "done" | "missed";
export type TaskSource = "manual" | "cursor" | "standard";
export type TaskCategory = "personal" | "work";
export type AnalysisProvider = "cursor" | "gemini" | "chatgpt";
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
  category?: TaskCategory;
  created_at: string;
}

export interface TaskTemplate {
  id: string;
  user_id: string;
  macro_goal_id: string | null;
  task_name: string;
  category: TaskCategory;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  work_context: string | null;
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
  provider: AnalysisProvider;
  created_at: string;
}

export type DeadlineGoalStatus = "active" | "completed" | "paused";

export interface DeadlineGoal {
  id: string;
  user_id: string;
  title: string;
  target_date: string;
  importance: number;
  macro_goal_id: string | null;
  implementation_notes: string | null;
  status: DeadlineGoalStatus;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface DeadlineMilestone {
  id: string;
  user_id: string;
  deadline_goal_id: string;
  title: string;
  target_date: string | null;
  is_done: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface DeadlineGoalWithMilestones extends DeadlineGoal {
  milestones: DeadlineMilestone[];
}

export interface CursorPlan {
  summary: string;
  cited_journal_ids?: string[];
  cited_task_ids?: string[];
  tomorrow_tasks: Array<{
    macro_goal_slug: MacroGoalSlug;
    task_name: string;
    category?: TaskCategory;
  }>;
  rule_changes?: {
    add?: Array<{ rule_text: string; priority?: number }>;
    demote?: Array<{ id: string; priority: number }>;
    deactivate?: string[];
  };
}
