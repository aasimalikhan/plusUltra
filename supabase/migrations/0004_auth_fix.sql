-- plusUltra custom auth (run after 0001 + 0002).
-- Self-contained: creates app_users, repoints profiles, cleans orphans, adds register_app_user.
-- Safe to run even if 0003 was skipped or failed.

-- -------------------------------------------------------------------------
-- A) app_users table + profiles FK
-- -------------------------------------------------------------------------
create table if not exists public.app_users (
    id uuid primary key default gen_random_uuid(),
    username text not null,
    password_hash text not null,
    created_at timestamptz not null default now()
);

create unique index if not exists app_users_username_lower_idx
    on public.app_users (lower(username));

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles drop constraint if exists profiles_app_users_fkey;

-- Remove Supabase Auth profiles (no matching app_users row yet)
delete from public.profiles p
where not exists (
    select 1 from public.app_users u where u.id = p.id
);

alter table public.profiles
    add constraint profiles_app_users_fkey
    foreign key (id) references public.app_users(id) on delete cascade;

-- Backfill profiles for any app_users created without a profile
insert into public.profiles (id, display_name)
select u.id, u.username
from public.app_users u
where not exists (
    select 1 from public.profiles p where p.id = u.id
);

-- -------------------------------------------------------------------------
-- B) seed_user_defaults (no auth.uid check)
-- -------------------------------------------------------------------------
create or replace function public.seed_user_defaults(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    did_anything boolean := false;
    g_rich uuid;
    g_musc uuid;
    g_intl uuid;
    plan_id uuid;
    today_date date := (now() at time zone 'utc')::date;
begin
    if not exists (select 1 from public.app_users where id = p_user_id) then
        raise exception 'unknown user';
    end if;

    if not exists (select 1 from public.macro_goals where user_id = p_user_id) then
        insert into public.macro_goals (user_id, slug, title, sort_order)
        values
            (p_user_id, 'RICH',        'BECOME INCREDIBLY RICH',        0),
            (p_user_id, 'MUSCULAR',    'BECOME INCREDIBLY MUSCULAR',    1),
            (p_user_id, 'INTELLIGENT', 'BECOME INCREDIBLY INTELLIGENT', 2);
        did_anything := true;
    end if;

    select id into g_rich from public.macro_goals where user_id = p_user_id and slug = 'RICH';
    select id into g_musc from public.macro_goals where user_id = p_user_id and slug = 'MUSCULAR';
    select id into g_intl from public.macro_goals where user_id = p_user_id and slug = 'INTELLIGENT';

    if not exists (select 1 from public.rules where user_id = p_user_id) then
        insert into public.rules (user_id, rule_text, priority) values
            (p_user_id, 'Repair not blame. Fix not fixate. Acknowledge damage, take the linear repair action, move on.', 10),
            (p_user_id, 'I am a slave to the logical brain. The schedule was set by the version of me that was thinking clearly.', 20),
            (p_user_id, 'Performance over output. Did I execute today''s system? The result is downstream of that.', 30),
            (p_user_id, 'Karm karo, phal ki chinta mat karo. I do not work for myself; I work for something larger.', 40),
            (p_user_id, 'Failure rate at the start is supposed to be 80%. That is the system, not a personal flaw.', 50),
            (p_user_id, 'Never underestimate the capacity of my brain to forget. Write everything down.', 60);
        did_anything := true;
    end if;

    if not exists (select 1 from public.daily_plans where user_id = p_user_id and plan_date = today_date) then
        insert into public.daily_plans (user_id, plan_date) values (p_user_id, today_date)
        returning id into plan_id;
        did_anything := true;

        insert into public.tasks (user_id, daily_plan_id, macro_goal_id, task_name) values
            (p_user_id, plan_id, g_rich, 'Studied System Design'),
            (p_user_id, plan_id, g_rich, 'Solved DSA'),
            (p_user_id, plan_id, g_rich, 'Studied Financial Planning'),
            (p_user_id, plan_id, g_musc, 'Hit the gym'),
            (p_user_id, plan_id, g_musc, 'Diet'),
            (p_user_id, plan_id, g_intl, 'Pointed Journaling'),
            (p_user_id, plan_id, g_intl, 'Read Book');
    end if;

    return did_anything;
end;
$$;

revoke execute on function public.seed_user_defaults(uuid) from authenticated;
grant execute on function public.seed_user_defaults(uuid) to service_role;

-- -------------------------------------------------------------------------
-- C) Atomic signup
-- -------------------------------------------------------------------------
create or replace function public.register_app_user(
    p_username text,
    p_password_hash text
)
returns table (user_id uuid, username text)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id uuid;
    v_username text;
begin
    v_username := lower(trim(p_username));
    if length(v_username) < 3 then
        raise exception 'username too short';
    end if;
    if length(p_password_hash) < 1 then
        raise exception 'missing password hash';
    end if;

    insert into public.app_users (username, password_hash)
    values (v_username, p_password_hash)
    returning id, app_users.username into v_id, v_username;

    insert into public.profiles (id, display_name)
    values (v_id, v_username);

    return query select v_id, v_username;
end;
$$;

revoke all on function public.register_app_user(text, text) from public;
grant execute on function public.register_app_user(text, text) to service_role;
