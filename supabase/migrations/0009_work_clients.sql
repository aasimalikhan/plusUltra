-- Split work context: Verizon (employer) + freelance (side clients/projects)
-- work_client tags work-category tasks for UI and analysis.

alter table public.profiles
  add column if not exists work_context_verizon text,
  add column if not exists work_context_freelance text;

-- Migrate legacy single blob → Verizon field
update public.profiles
set work_context_verizon = work_context
where work_context is not null
  and trim(work_context) <> ''
  and (work_context_verizon is null or trim(work_context_verizon) = '');

alter table public.tasks
  add column if not exists work_client text
      check (work_client is null or work_client in ('verizon', 'freelance'));

alter table public.task_templates
  add column if not exists work_client text
      check (work_client is null or work_client in ('verizon', 'freelance'));

-- Default existing work tasks to verizon
update public.tasks
set work_client = 'verizon'
where category = 'work' and work_client is null;
