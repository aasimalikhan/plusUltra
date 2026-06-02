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
| Database | Supabase Postgres                  | free |
| Auth     | Username + password (app session)  | free |
| Hosting  | Vercel                             | free |
| AI       | Cursor Pro (copy/paste)            | uses your existing subscription |

No API keys. No cron jobs. No vector DB in v1.

## Run locally

```bash
npm install
cp .env.example .env.local      # fill URL, publishable key, service role, SESSION_SECRET
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Use **username + password**
(first visit: **Create account**, then **Sign in**).

## Supabase setup

See [`supabase/README.md`](./supabase/README.md). Run migrations `0001`, `0002`, and `0003`.
You need the **service role** secret in `.env.local` (server only — never expose in the client).

On your first visit to `/today` the app calls `seed_user_defaults()` which inserts
3 macro goals (RICH / MUSCULAR / INTELLIGENT), 6 starter NEW ME rules, and today's
default tasks.

## Daily ritual

1. **Morning** (`/today`): read the NEW ME banner end-to-end, check the success-rate
   badge, see the day's tasks under each macro pillar.
2. **Through the day**: hit "Log a trigger right now" on `/today` whenever something
   derails you. Mark tasks done as you finish them.
3. **Evening** (`/today` from 6pm, auto-miss at **11pm**): debrief checklist guides
   journal → Cursor. Pending tasks flip to `missed` on first visit after 11pm (or
   any past day you skipped). Fix-Not-Fixate modal reopens until every miss has a
   journal entry. Repairs auto-queue as tomorrow's tasks.
4. **End of day** (`/cursor`):
   1. Click **Copy prompt + context**.
   2. Open a new Cursor chat, paste, send.
   3. Copy Cursor's JSON reply back into the paste box, **Validate**, **Apply**.
5. **Tomorrow morning** — Cursor's mutated plan is already there. Loop.

## Routes

| Path                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `/login`                  | Username + password sign in / sign up                |
| `/today`                  | The daily ritual                                     |
| `/journal`                | All pointed journal entries (Fix-Not-Fixate + ad-hoc) |
| `/insights`               | All Cursor analysis runs (raw JSON preserved)        |
| `/cursor`                 | Copy deep context → paste Cursor JSON back           |
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
- **Server-scoped data access.** Logged-in user id comes from an encrypted session cookie;
  the server uses the Supabase service role and filters every query by `user_id`.

## v2 / v3 candidates (intentionally deferred)

- `pgvector` semantic recall once you have ~30 days of journal data
- Autonomous nightly agent against an LLM API (replaces the copy/paste bridge)
- Schema-aware natural-language analytics ("show me my worst trigger by weekday")
