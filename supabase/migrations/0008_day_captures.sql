-- Day captures: quick thoughts, reels, links — consumed by nightly analysis then cleared.

create table if not exists public.day_captures (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    content text not null check (char_length(trim(content)) > 0),
    created_at timestamptz not null default now()
);

create index if not exists idx_day_captures_user_created
    on public.day_captures(user_id, created_at desc);
