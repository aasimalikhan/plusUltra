-- Via Negativa (anti-tasks), friction levels, work cutoff, void focus sessions

-- -------------------------------------------------------------------------
-- tasks: subtractive habits + execution friction
-- -------------------------------------------------------------------------
alter table public.tasks
  add column if not exists is_anti_task boolean not null default false,
  add column if not exists friction_level int not null default 1
    check (friction_level between 1 and 3);

-- -------------------------------------------------------------------------
-- task_templates: same fields for standard daily roll
-- -------------------------------------------------------------------------
alter table public.task_templates
  add column if not exists is_anti_task boolean not null default false,
  add column if not exists friction_level int not null default 1
    check (friction_level between 1 and 3);

-- -------------------------------------------------------------------------
-- profiles: employer work lock time (local timezone interpreted in app)
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists daily_work_cutoff time not null default '18:00'::time;

-- -------------------------------------------------------------------------
-- focus_sessions: deep work vs void mode
-- -------------------------------------------------------------------------
alter table public.focus_sessions
  add column if not exists session_type text not null default 'deep_work'
    check (session_type in ('deep_work', 'void'));
