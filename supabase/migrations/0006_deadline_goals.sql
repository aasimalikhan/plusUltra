-- Deadline goals + milestones (V.IMP page — deadlines are god)

create table if not exists public.deadline_goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    target_date date not null,
    importance int not null default 3 check (importance between 1 and 5),
    macro_goal_id uuid references public.macro_goals(id) on delete set null,
    implementation_notes text,
    status text not null default 'active' check (status in ('active', 'completed', 'paused')),
    sort_order int not null default 0,
    completed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_deadline_goals_user_status
    on public.deadline_goals(user_id, status, target_date);

create table if not exists public.deadline_milestones (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    deadline_goal_id uuid not null references public.deadline_goals(id) on delete cascade,
    title text not null,
    target_date date,
    is_done boolean not null default false,
    completed_at timestamptz,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_deadline_milestones_goal
    on public.deadline_milestones(deadline_goal_id, sort_order);

alter table public.deadline_goals enable row level security;
alter table public.deadline_milestones enable row level security;

drop policy if exists "user_isolation" on public.deadline_goals;
create policy "user_isolation" on public.deadline_goals
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_isolation" on public.deadline_milestones;
create policy "user_isolation" on public.deadline_milestones
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
