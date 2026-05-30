# Supabase Setup

This directory holds the SQL migrations for plusUltra v1.

## One-time setup

1. Create a new project at [supabase.com](https://supabase.com) (free tier is fine).
2. In the project's **SQL Editor**, paste and run each file in order:
   - `migrations/0001_init.sql`
   - `migrations/0002_seed_fn.sql`
3. Go to **Authentication → Providers → Email**:
   - **Enable Email provider** = on
   - **Confirm email** = off (so sign-up works instantly, no inbox needed)
   - **Secure email change** = optional
   Login uses **email + password** only (no magic links, no rate limits on OTP emails).
4. Copy **Project URL** and **Publishable key** (`sb_publishable_...`) from **Settings → API**
   (or the Connect → Next.js modal) into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Older projects may still show `anon` (JWT) — that also works as
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

5. Run the app (`npm run dev`), sign in with your email. On first visit to `/today` the app
   calls `seed_user_defaults()` which inserts:
   - 3 macro goals (RICH / MUSCULAR / INTELLIGENT)
   - 6 starter NEW ME rules
   - Today's daily plan with template tasks

## Production deploy

Set the same `NEXT_PUBLIC_SUPABASE_*` env vars on Vercel as in `.env.local`. No redirect URL setup needed for password login.

## Re-running migrations

These files are idempotent (`if not exists`, `on conflict do nothing`, `drop policy if exists`),
so it is safe to re-run them on an existing project.
