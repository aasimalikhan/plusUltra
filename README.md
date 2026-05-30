# plusUltra

Single-user productivity + introspection app that runs the plusUltra behavioral
framework end-to-end:

- **Morning Briefing** — read your NEW ME rules, see visual anchors, see today's plan
- **Evening Debrief** — checkbox sweep; anything left `pending` after 4pm is auto-flipped
  to `missed` and walked through the **Fix-Not-Fixate** modal one task at a time
- **Pointed journaling** — CBT-style trigger / thought / repair records, immutable
- **Cursor bridge** at `/cursor` — one-click copy of a deterministic 7-day context block
  + analyst prompt; paste Cursor's JSON reply back, app validates, previews the diff, and
  applies it to tomorrow's tasks + NEW ME rules. Every run is stored verbatim in
  `analysis_runs` (no summarization drift)
- **Rolling 14-day system success rate** — framed as system health, not personal worth

## Stack

| Layer    | Choice                             | Cost |
| -------- | ---------------------------------- | ---- |
| UI       | Next.js 14 (App Router) + Tailwind | free |
| Backend  | Supabase (Postgres + Auth + RLS)   | free |
| Hosting  | Vercel                             | free |
| AI       | Cursor Pro (copy/paste)            | uses your existing subscription |

No API keys. No cron jobs. No vector DB in v1.

## Run locally

```bash
npm install
cp .env.example .env.local      # then fill in URL + publishable key (sb_publishable_...)
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Use **email + password**
(first visit: **Create account**, then **Sign in**).

## Supabase setup

See [`supabase/README.md`](./supabase/README.md). TL;DR: in the SQL editor, run
`migrations/0001_init.sql` then `migrations/0002_seed_fn.sql`. Email auth on.

On your first visit to `/today` the app calls `seed_user_defaults()` which inserts
3 macro goals (RICH / MUSCULAR / INTELLIGENT), 6 starter NEW ME rules, and today's
default tasks.

## Daily ritual

1. **Morning** (`/today`): read the NEW ME banner end-to-end, check the success-rate
   badge, see the day's tasks under each macro pillar.
2. **Through the day**: hit "Log a trigger right now" on `/today` whenever something
   derails you. Mark tasks done as you finish them.
3. **Evening** (`/today` after 4pm): anything still `pending` flips to `missed` and a
   modal walks you through one repair per missed task. No blame, no streak.
4. **End of day** (`/cursor`):
   1. Click **Copy prompt + context**.
   2. Open a new Cursor chat, paste, send.
   3. Copy Cursor's JSON reply back into the paste box, **Validate**, **Apply**.
5. **Tomorrow morning** — Cursor's mutated plan is already there. Loop.

## Routes

| Path                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `/login`                  | Email + password sign in / sign up                   |
| `/today`                  | The daily ritual                                     |
| `/cursor`                 | In-app paste bridge to Cursor Pro                    |
| `/rules`                  | Manage NEW ME codes (add / archive / re-prioritize)  |
| `/goals`                  | Edit macro goals, deadlines, visual anchor URLs      |
| `/history`                | Last 60 days, with per-day raw data + Cursor outputs |
| `/history/YYYY-MM-DD`     | Tasks + journal + analysis runs for that date        |

## Architectural commitments worth knowing

- **`pointed_journal` is immutable.** AI output never overwrites journal rows. All Cursor
  output lands in `analysis_runs(cursor_raw_input, cursor_raw_output, cited_journal_ids,
  cited_task_ids)`. This is the anti-summarization-drift rule from the research doc.
- **No streaks.** Performance is shown as a rolling 14-day success rate (`done / (done +
  missed)`), with explicit "this is system health, not personal worth" framing.
- **No blame UI.** Missed tasks open the Fix-Not-Fixate flow, asking only `trigger /
  thought / impact / repair / damage`. No "I failed" button.
- **Single user but RLS-on.** Every table has a `auth.uid() = user_id` policy.

## v2 / v3 candidates (intentionally deferred)

- `pgvector` semantic recall once you have ~30 days of journal data
- Autonomous nightly agent against an LLM API (replaces the copy/paste bridge)
- Schema-aware natural-language analytics ("show me my worst trigger by weekday")
