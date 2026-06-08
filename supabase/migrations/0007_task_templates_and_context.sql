-- Standard daily task templates, work/personal categories, analysis provider, work context

-- -------------------------------------------------------------------------
-- profiles: persistent work context for analysis prompts
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists work_context text;

-- -------------------------------------------------------------------------
-- task_templates: configurable daily standards (replaces hard-coded seed only)
-- -------------------------------------------------------------------------
create table if not exists public.task_templates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    macro_goal_id uuid references public.macro_goals(id) on delete set null,
    task_name text not null,
    category text not null default 'personal'
        check (category in ('personal', 'work')),
    is_active boolean not null default true,
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    unique (user_id, task_name)
);

create index if not exists idx_task_templates_user_active
    on public.task_templates(user_id, is_active, sort_order);

-- -------------------------------------------------------------------------
-- tasks: category + standard source
-- -------------------------------------------------------------------------
alter table public.tasks
  add column if not exists category text not null default 'personal'
      check (category in ('personal', 'work'));

alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check
    check (source in ('manual', 'cursor', 'standard'));

-- -------------------------------------------------------------------------
-- analysis_runs: which LLM provider produced the output
-- -------------------------------------------------------------------------
alter table public.analysis_runs
  add column if not exists provider text not null default 'cursor'
      check (provider in ('cursor', 'gemini', 'chatgpt'));
