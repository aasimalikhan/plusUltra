-- plusUltra v1 - initial schema
-- Single user but RLS on (auth.uid() = user_id everywhere) for safety + future-proofing.

create extension if not exists "pgcrypto";

-- =========================================================================
-- profiles
-- =========================================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now()
);

-- =========================================================================
-- macro_goals  (RICH / MUSCULAR / INTELLIGENT)
-- =========================================================================
create table if not exists public.macro_goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    slug text not null check (slug in ('RICH','MUSCULAR','INTELLIGENT')),
    title text not null,
    visual_anchor_url text,
    deadline date,
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    unique (user_id, slug)
);

-- =========================================================================
-- daily_plans
-- =========================================================================
create table if not exists public.daily_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    plan_date date not null,
    is_locked boolean not null default false,
    created_at timestamptz not null default now(),
    unique (user_id, plan_date)
);

-- =========================================================================
-- tasks
-- =========================================================================
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    daily_plan_id uuid not null references public.daily_plans(id) on delete cascade,
    macro_goal_id uuid references public.macro_goals(id) on delete set null,
    task_name text not null,
    status text not null default 'pending' check (status in ('pending','done','missed')),
    completed_at timestamptz,
    source text not null default 'manual' check (source in ('manual','cursor')),
    created_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_plan on public.tasks(user_id, daily_plan_id);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);

-- =========================================================================
-- pointed_journal (immutable CBT thought records)
-- =========================================================================
create table if not exists public.pointed_journal (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    daily_plan_id uuid references public.daily_plans(id) on delete set null,
    related_task_id uuid references public.tasks(id) on delete set null,
    trigger_event text not null,
    automatic_thought text,
    emotional_impact int check (emotional_impact between 0 and 100),
    identified_schema text,
    system_repair text not null,
    long_term_damage text,
    is_resolved boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_journal_user_created on public.pointed_journal(user_id, created_at desc);

-- =========================================================================
-- rules ("NEW ME" codes)
-- =========================================================================
create table if not exists public.rules (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    rule_text text not null,
    is_active boolean not null default true,
    priority int not null default 100,
    last_relevant_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_rules_user_active on public.rules(user_id, is_active, priority);

-- =========================================================================
-- analysis_runs (Cursor RAG output, raw - never overwrites journal)
-- =========================================================================
create table if not exists public.analysis_runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    run_date date not null,
    cited_journal_ids uuid[] not null default '{}',
    cited_task_ids uuid[] not null default '{}',
    cursor_raw_input jsonb,
    cursor_raw_output jsonb,
    summary text,
    created_at timestamptz not null default now()
);

create index if not exists idx_runs_user_date on public.analysis_runs(user_id, run_date desc);

-- =========================================================================
-- Auto-create profile on signup
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =========================================================================
-- RLS - user isolation
-- =========================================================================
alter table public.profiles        enable row level security;
alter table public.macro_goals     enable row level security;
alter table public.daily_plans     enable row level security;
alter table public.tasks           enable row level security;
alter table public.pointed_journal enable row level security;
alter table public.rules           enable row level security;
alter table public.analysis_runs   enable row level security;

drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
    for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare
    t text;
begin
    for t in select unnest(array[
        'macro_goals','daily_plans','tasks','pointed_journal','rules','analysis_runs'
    ])
    loop
        execute format('drop policy if exists "user_isolation" on public.%I;', t);
        execute format(
            'create policy "user_isolation" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
            t
        );
    end loop;
end $$;
