-- Allow custom macro pillars beyond RICH / MUSCULAR / INTELLIGENT

alter table public.macro_goals drop constraint if exists macro_goals_slug_check;

alter table public.macro_goals
    add constraint macro_goals_slug_format
    check (slug ~ '^[A-Z][A-Z0-9_]{1,31}$');
