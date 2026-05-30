-- Per-user seed routine. Idempotent. Runs the first time a profile uses /today.
-- Returns true if anything was inserted.

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
    if auth.uid() is null or auth.uid() <> p_user_id then
        raise exception 'unauthorized seed';
    end if;

    -- macro goals
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

    -- starter NEW ME rules
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

    -- today's plan + template tasks
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

grant execute on function public.seed_user_defaults(uuid) to authenticated;
