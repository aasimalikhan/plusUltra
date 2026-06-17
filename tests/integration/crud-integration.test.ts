/**
 * Heavy integration tests — real Supabase CRUD + API routes.
 * Run: RUN_INTEGRATION_TESTS=1 npm run test:integration
 * Creates ephemeral test users; deletes them after each suite.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { integrationEnabled } from "./setup";
import { createTestUser, deleteTestUser, getAdmin, withTestUser } from "./helpers/test-user";
import { formatDateISO } from "@/lib/utils";
import { fetchWorkContextBundleForUser, fetchRecentContextForUser } from "@/lib/queries";
import { buildCursorContextMarkdown } from "@/lib/context-formatter";
import { applyPlanForUser } from "@/lib/nightly-analysis";
import { validateCursorPlan } from "@/lib/cursor-plan-validation";

const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("integration · CRUD + API", () => {
  let richGoalId: string;

  beforeAll(() => {
    if (!integrationEnabled) return;
  });

  it("registers test user, seeds defaults, deletes cleanly", async () => {
    const user = await createTestUser("lifecycle");
    const supabase = getAdmin();
    const { data: goals } = await supabase
      .from("macro_goals")
      .select("slug")
      .eq("user_id", user.userId);
    expect((goals ?? []).length).toBeGreaterThanOrEqual(3);
    await deleteTestUser(user.userId);
    const { data: gone } = await supabase
      .from("app_users")
      .select("id")
      .eq("id", user.userId)
      .maybeSingle();
    expect(gone).toBeNull();
  });

  it("work context verizon + freelance round-trip", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      await supabase
        .from("profiles")
        .update({
          work_context_verizon: "Verizon GEMS UAT",
          work_context_freelance: "Afroz image slider + Cursor bills",
        })
        .eq("id", userId);

      const bundle = await fetchWorkContextBundleForUser(supabase, userId);
      expect(bundle.verizon).toContain("GEMS");
      expect(bundle.freelance).toContain("Afroz");

      const md = buildCursorContextMarkdown(
        await fetchRecentContextForUser(supabase, userId, 7),
      );
      expect(md).toContain("Verizon · employer");
      expect(md).toContain("Freelance · side clients");
    }, "workctx");
  });

  it("tasks CRUD with work_client verizon and freelance", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const today = formatDateISO();
      const { data: plan } = await supabase
        .from("daily_plans")
        .upsert({ user_id: userId, plan_date: today }, { onConflict: "user_id,plan_date" })
        .select("id")
        .single();

      const { data: goals } = await supabase
        .from("macro_goals")
        .select("id")
        .eq("user_id", userId)
        .eq("slug", "RICH")
        .single();
      richGoalId = goals!.id;

      const { data: vzTask } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          daily_plan_id: plan!.id,
          macro_goal_id: richGoalId,
          task_name: "DLM vulnerability fix",
          category: "work",
          work_client: "verizon",
          source: "manual",
        })
        .select("*")
        .single();

      const { data: flTask } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          daily_plan_id: plan!.id,
          macro_goal_id: richGoalId,
          task_name: "Afroz slider view",
          category: "work",
          work_client: "freelance",
          source: "manual",
        })
        .select("*")
        .single();

      expect(vzTask!.work_client).toBe("verizon");
      expect(flTask!.work_client).toBe("freelance");

      await supabase.from("tasks").update({ status: "done" }).eq("id", vzTask!.id);
      const { data: updated } = await supabase
        .from("tasks")
        .select("status")
        .eq("id", vzTask!.id)
        .single();
      expect(updated!.status).toBe("done");

      await supabase.from("tasks").delete().eq("id", flTask!.id);
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("id", flTask!.id);
      expect(count).toBe(0);
    }, "tasks");
  });

  it("goals CRUD", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const { data: created } = await supabase
        .from("macro_goals")
        .insert({
          user_id: userId,
          slug: "CREATIVE",
          title: "Become creative",
          sort_order: 99,
        })
        .select("*")
        .single();
      expect(created!.slug).toBe("CREATIVE");

      await supabase
        .from("macro_goals")
        .update({ title: "Become incredibly creative" })
        .eq("id", created!.id);

      await supabase.from("macro_goals").delete().eq("id", created!.id);
    }, "goals");
  });

  it("rules CRUD + priority", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const { data: rule } = await supabase
        .from("rules")
        .insert({
          user_id: userId,
          rule_text: "Test rule integration",
          priority: 200,
        })
        .select("*")
        .single();

      await supabase
        .from("rules")
        .update({ priority: 150 })
        .eq("id", rule!.id);

      await supabase.from("rules").update({ is_active: false }).eq("id", rule!.id);
      await supabase.from("rules").delete().eq("id", rule!.id);
    }, "rules");
  });

  it("deadlines + milestones CRUD", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const { data: dl } = await supabase
        .from("deadline_goals")
        .insert({
          user_id: userId,
          title: "Pass system design interview",
          target_date: "2026-12-01",
          importance: 5,
          status: "active",
        })
        .select("*")
        .single();

      const { data: ms } = await supabase
        .from("deadline_milestones")
        .insert({
          user_id: userId,
          deadline_goal_id: dl!.id,
          title: "Finish design primer",
          sort_order: 0,
        })
        .select("*")
        .single();

      await supabase
        .from("deadline_milestones")
        .update({ is_done: true })
        .eq("id", ms!.id);

      await supabase.from("deadline_milestones").delete().eq("id", ms!.id);
      await supabase.from("deadline_goals").delete().eq("id", dl!.id);
    }, "deadlines");
  });

  it("day captures CRUD + clear", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const { data: cap } = await supabase
        .from("day_captures")
        .insert({ user_id: userId, content: "Reel on sleep hygiene" })
        .select("*")
        .single();

      const { data: list } = await supabase
        .from("day_captures")
        .select("*")
        .eq("user_id", userId);
      expect(list!.length).toBe(1);

      await supabase.from("day_captures").delete().eq("id", cap!.id);
    }, "captures");
  });

  it("journal insert + resolve", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const today = formatDateISO();
      const { data: plan } = await supabase
        .from("daily_plans")
        .upsert({ user_id: userId, plan_date: today }, { onConflict: "user_id,plan_date" })
        .select("id")
        .single();

      const { data: entry } = await supabase
        .from("pointed_journal")
        .insert({
          user_id: userId,
          daily_plan_id: plan!.id,
          trigger_event: "missed gym",
          system_repair: "30 min cardio block tomorrow",
        })
        .select("*")
        .single();

      await supabase
        .from("pointed_journal")
        .update({ is_resolved: true })
        .eq("id", entry!.id);

      const { data: resolved } = await supabase
        .from("pointed_journal")
        .select("is_resolved")
        .eq("id", entry!.id)
        .single();
      expect(resolved!.is_resolved).toBe(true);
    }, "journal");
  });

  it("task templates CRUD", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const { data: tpl } = await supabase
        .from("task_templates")
        .insert({
          user_id: userId,
          task_name: "Integration standard task",
          category: "work",
          work_client: "freelance",
          sort_order: 500,
        })
        .select("*")
        .single();

      await supabase
        .from("task_templates")
        .update({ is_active: false })
        .eq("id", tpl!.id);

      await supabase.from("task_templates").delete().eq("id", tpl!.id);
    }, "templates");
  });

  it("applyPlanForUser inserts tomorrow tasks with work_client", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const { data: goals } = await supabase
        .from("macro_goals")
        .select("slug")
        .eq("user_id", userId);
      const slugs = new Set((goals ?? []).map((g) => g.slug as string));

      const planJson = {
        summary: "Integration test plan",
        cited_journal_ids: [],
        cited_task_ids: [],
        tomorrow_tasks: [
          {
            macro_goal_slug: "RICH",
            task_name: "Freelance client call 20 min",
            category: "work",
            work_client: "freelance",
          },
          {
            macro_goal_slug: "INTELLIGENT",
            task_name: "System design 60 min",
            category: "personal",
          },
        ],
        rule_changes: { add: [], demote: [], deactivate: [] },
      };

      const validated = validateCursorPlan(planJson, slugs);
      expect(validated.ok).toBe(true);

      const applied = await applyPlanForUser(supabase, userId, {
        rawInputMarkdown: "# test",
        rawOutputText: JSON.stringify(planJson),
        provider: "gemini",
      });
      expect(applied.ok).toBe(true);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().slice(0, 10);

      const { data: tplan } = await supabase
        .from("daily_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("plan_date", tomorrowISO)
        .single();

      const { data: tasks } = await supabase
        .from("tasks")
        .select("task_name, work_client, category")
        .eq("daily_plan_id", tplan!.id);

      const freelance = tasks!.find((t) => t.work_client === "freelance");
      expect(freelance?.task_name).toContain("Freelance");
    }, "analysis");
  });

  it("applyPlanForUser clears day captures after apply", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      await supabase.from("day_captures").insert([
        { user_id: userId, content: "Reel on focus blocks" },
        { user_id: userId, content: "Thought on sleep" },
      ]);

      const { data: goals } = await supabase
        .from("macro_goals")
        .select("slug")
        .eq("user_id", userId);
      const slugs = new Set((goals ?? []).map((g) => g.slug as string));

      const planJson = {
        summary: "Capture clear test",
        cited_journal_ids: [],
        cited_task_ids: [],
        tomorrow_tasks: [
          {
            macro_goal_slug: "RICH",
            task_name: "Review captures 10 min",
            category: "personal",
          },
        ],
        rule_changes: { add: [], demote: [], deactivate: [] },
      };

      const applied = await applyPlanForUser(supabase, userId, {
        rawInputMarkdown: "# test",
        rawOutputText: JSON.stringify(planJson),
        provider: "gemini",
      });
      expect(applied.ok).toBe(true);

      const { count } = await supabase
        .from("day_captures")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      expect(count).toBe(0);
    }, "captures-clear");
  });

  it("task work_client can be updated verizon ↔ freelance", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const today = formatDateISO();
      const { data: plan } = await supabase
        .from("daily_plans")
        .upsert({ user_id: userId, plan_date: today }, { onConflict: "user_id,plan_date" })
        .select("id")
        .single();

      const { data: goal } = await supabase
        .from("macro_goals")
        .select("id")
        .eq("user_id", userId)
        .eq("slug", "RICH")
        .single();

      const { data: task, error: insErr } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          daily_plan_id: plan!.id,
          macro_goal_id: goal!.id,
          task_name: "Client deliverable",
          category: "work",
          work_client: "verizon",
          source: "manual",
        })
        .select("*")
        .single();
      expect(insErr).toBeNull();
      expect(task!.work_client).toBe("verizon");

      const { error: updErr } = await supabase
        .from("tasks")
        .update({ work_client: "freelance" })
        .eq("id", task!.id);
      expect(updErr).toBeNull();

      const { data: updated } = await supabase
        .from("tasks")
        .select("work_client")
        .eq("id", task!.id)
        .single();
      expect(updated!.work_client).toBe("freelance");
    }, "work-client-toggle");
  });

  it("seed_user_defaults creates goals, rules, today plan, and standard templates", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const today = formatDateISO();
      const [goals, rules, templates, plan] = await Promise.all([
        supabase.from("macro_goals").select("slug").eq("user_id", userId),
        supabase.from("rules").select("id").eq("user_id", userId).eq("is_active", true),
        supabase.from("task_templates").select("id").eq("user_id", userId).eq("is_active", true),
        supabase
          .from("daily_plans")
          .select("id")
          .eq("user_id", userId)
          .eq("plan_date", today)
          .maybeSingle(),
      ]);

      expect((goals.data ?? []).length).toBeGreaterThanOrEqual(3);
      expect((rules.data ?? []).length).toBeGreaterThan(0);
      expect((templates.data ?? []).length).toBeGreaterThanOrEqual(7);
      expect(plan.data?.id).toBeTruthy();

      const { count: taskCount } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("daily_plan_id", plan.data!.id);
      expect(taskCount).toBeGreaterThanOrEqual(7);

      const slugs = new Set((goals.data ?? []).map((g) => g.slug));
      expect(slugs.has("RICH")).toBe(true);
      expect(slugs.has("MUSCULAR")).toBe(true);
      expect(slugs.has("INTELLIGENT")).toBe(true);
    }, "seed-defaults");
  });

  it("legacy work_context falls back to verizon field in bundle", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const { error } = await supabase
        .from("profiles")
        .update({
          work_context: "Legacy Verizon-only blob",
          work_context_verizon: null,
          work_context_freelance: null,
        })
        .eq("id", userId);
      expect(error).toBeNull();

      const bundle = await fetchWorkContextBundleForUser(supabase, userId);
      expect(bundle.verizon).toContain("Legacy Verizon");
    }, "legacy-workctx");
  });

  it("validateCursorPlan rejects unknown macro slug", async () => {
    const result = validateCursorPlan(
      {
        summary: "bad",
        tomorrow_tasks: [
          { macro_goal_slug: "NOTREAL", task_name: "x", category: "personal" },
        ],
      },
      new Set(["RICH", "MUSCULAR", "INTELLIGENT"]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("NOTREAL");
  });

  it("daily plan lock flag can be toggled", async () => {
    await withTestUser(async ({ userId }) => {
      const supabase = getAdmin();
      const today = formatDateISO();
      const { data: plan } = await supabase
        .from("daily_plans")
        .upsert({ user_id: userId, plan_date: today }, { onConflict: "user_id,plan_date" })
        .select("id, is_locked")
        .single();

      const { error: lockErr } = await supabase
        .from("daily_plans")
        .update({ is_locked: true })
        .eq("id", plan!.id);
      expect(lockErr).toBeNull();

      const { data: locked } = await supabase
        .from("daily_plans")
        .select("is_locked")
        .eq("id", plan!.id)
        .single();
      expect(locked!.is_locked).toBe(true);
    }, "plan-lock");
  });

  it("GET /api/cron/nightly rejects bad auth", async () => {
    const { GET } = await import("@/app/api/cron/nightly/route");
    const res = await GET(
      new Request("http://localhost/api/cron/nightly", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/cron/nightly dryRun accepts valid secret without Gemini", async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return;
    const { GET } = await import("@/app/api/cron/nightly/route");
    const res = await GET(
      new Request("http://localhost/api/cron/nightly?dryRun=1", {
        headers: { Authorization: `Bearer ${secret}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(typeof body.userCount).toBe("number");
  });
});
