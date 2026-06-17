-- Focus timer session log (completed or ended early).

create table if not exists public.focus_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    intention text not null check (char_length(trim(intention)) > 0),
    planned_duration_seconds int not null check (planned_duration_seconds > 0),
    focused_seconds int not null check (focused_seconds >= 0),
    status text not null check (status in ('completed', 'ended_early')),
    started_at timestamptz not null,
    ended_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_focus_sessions_user_started
    on public.focus_sessions(user_id, started_at desc);
