Phase 1: The Zero-Cost Infrastructure Stack
To ensure this remains 100% free and easily maintainable for a single user, we will rely on platforms with generous free tiers that effortlessly handle daily personal data.

Database & Auth: Supabase (PostgreSQL). The free tier provides 500MB of database space and 50MB of file storage (perfect for your visual anchors). It gives you instant REST APIs, removing the need to build a custom backend.

Frontend / UI: Next.js (App Router). React-based, incredibly fast, and perfect for building dynamic dashboards.

Hosting: Vercel. Deploying Next.js on Vercel is one click and completely free for personal projects.

The AI Engine: Cursor IDE + Node.js Scripts. You will use simple terminal scripts to fetch your database context, dump it into a markdown file for Cursor to read, and push Cursor's output back to the database.

Phase 2: Database Architecture (Supabase SQL)
We need a structured relational schema to capture the "Logical Brain" metrics without overcomplicating data entry. Run these directly in the Supabase SQL Editor:

SQL
-- 1. Daily Checkboxes & Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category VARCHAR NOT NULL, -- 'RICH', 'MUSCULAR', 'INTELLIGENT'
    task_name TEXT NOT NULL,
    status BOOLEAN DEFAULT FALSE,
    target_date DATE NOT NULL
);

-- 2. Pointed Journaling & Triggers
CREATE TABLE pointed_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trigger_event TEXT NOT NULL,
    emotional_impact INTEGER, -- 0 to 100
    repair_action TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE
);

-- 3. The "NEW ME" Rules Engine
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rule_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1
);
Phase 3: The Cursor-to-Database Loop (The CLI Bridge)
This is the core of your zero-cost RAG architecture. Instead of the web app calling an LLM, you will run two Node.js scripts directly in your Cursor terminal.

Step 1: npm i @supabase/supabase-js fs in a local script folder.

Step 2: The Downloader (pull_context.js)
Write a script that queries Supabase for the last 7 days of tasks and pointed_journal entries. The script should format this data and write it directly to a local file named cursor_context.md.

Workflow: 1. Open Cursor terminal.
2. Run node pull_context.js.
3. Cursor now has a fresh .md file containing exactly what you succeeded at, what you failed at, and your triggers.

Step 3: The Cursor Analysis
Open cursor_context.md in Cursor. In the chat panel, use your prompt:

"Analyze this data based on the plusUltra philosophy. Identify my failure patterns from the journal. Generate 3 new task contingencies for tomorrow, and update my 'NEW ME' rules. Output the result in strictly formatted JSON."

Step 4: The Uploader (push_plan.js)
Save Cursor's JSON output to a file (e.g., next_day_plan.json). Write a second script that reads this JSON and uses the Supabase client to INSERT the new tasks into the tasks table and update the rules table.

Workflow:

Run node push_plan.js in the terminal.

The web app instantly updates for tomorrow.

Phase 4: The Web App UI (Next.js)
Keep the UI brutally simple, focusing entirely on data entry and the visual anchors.

1. The Dashboard (The "Visual Anchor" View)

Fetch the active rules table and display the "NEW ME" codes at the very top. You must scroll past them to see anything else.

Display images of your macro-goals (the car, the house) aggressively on the screen.

Render the daily tasks grouped by their categories (RICH, MUSCULAR, INTELLIGENT). Use a simple onClick to toggle the boolean status in Supabase.

2. The "Fix Not Fixate" Modal

If you fail a task (e.g., leaving a checkbox unchecked past midnight, or clicking a "Failed" button), immediately pop up a strict form.

Fields: What was the trigger? Emotional Impact (0-100)? What is the linear repair action?

This submits directly to the pointed_journal table, ensuring the failure is captured as data for Cursor to analyze tomorrow, rather than leaving you to spiral into blame.