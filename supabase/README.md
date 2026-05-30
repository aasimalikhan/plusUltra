# Supabase Setup

This directory holds the SQL migrations for plusUltra v1.

## One-time setup

1. Create a new project at [supabase.com](https://supabase.com) (free tier is fine).
2. In the project's **SQL Editor**, paste and run each file in order:
   - `migrations/0001_init.sql`
   - `migrations/0002_seed_fn.sql`
   - `migrations/0004_auth_fix.sql` (required — custom auth; skip 0003 if you run this)
   - `migrations/0005_flexible_macro_goals.sql` (optional — add custom macro pillars beyond RICH/MUSCULAR/INTELLIGENT)
3. Copy keys from **Settings → API** into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=...secret service_role key...
   SESSION_SECRET=...at least 32 random characters...
   ```

   Generate `SESSION_SECRET` (PowerShell):

   ```powershell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
   ```

4. Run the app (`npm run dev`). Open `/login`, **Create account** with a username + password.
   On first visit to `/today` the app calls `seed_user_defaults()` which inserts:
   - 3 macro goals (RICH / MUSCULAR / INTELLIGENT)
   - 6 starter NEW ME rules
   - Today's daily plan with template tasks

**Auth:** plusUltra uses its own `app_users` table (username + bcrypt password). Supabase Auth is not used. The service role key is server-only and never shipped to the browser.

## Production deploy

Set all four env vars on Vercel (same as `.env.local`). No Supabase redirect URL setup needed.

## Re-running migrations

`0001` and `0002` are idempotent. `0003` should be run once. If you already had Supabase Auth users linked to `profiles`, you may need a fresh project or manual cleanup before `0003` (it repoints `profiles` to `app_users`).
