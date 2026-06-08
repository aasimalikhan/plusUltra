import { describe, expect, it } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { DEFAULT_STANDARD_TASKS } from "@/lib/standard-tasks";

const APP_ROOT = join(process.cwd(), "src", "app");

const ROUTES = [
  "page.tsx",
  "today/page.tsx",
  "manage/page.tsx",
  "cursor/page.tsx",
  "journal/page.tsx",
  "insights/page.tsx",
  "rules/page.tsx",
  "goals/page.tsx",
  "deadlines/page.tsx",
  "attack-mode/page.tsx",
  "history/page.tsx",
  "history/[date]/page.tsx",
  "login/page.tsx",
];

const MIGRATIONS = [
  "0001_init.sql",
  "0006_deadline_goals.sql",
  "0007_task_templates_and_context.sql",
];

describe("Phase 5 · app structure & migrations", () => {
  it("all primary routes exist on disk", () => {
    for (const route of ROUTES) {
      expect(existsSync(join(APP_ROOT, route))).toBe(true);
    }
  });

  it("required migrations exist", () => {
    for (const m of MIGRATIONS) {
      expect(existsSync(join(process.cwd(), "supabase", "migrations", m))).toBe(
        true,
      );
    }
  });

  it("standard daily tasks template has 7 pillars tasks", () => {
    expect(DEFAULT_STANDARD_TASKS).toHaveLength(7);
    const slugs = new Set(DEFAULT_STANDARD_TASKS.map((t) => t.slug));
    expect(slugs).toEqual(new Set(["RICH", "MUSCULAR", "INTELLIGENT"]));
  });

  it("page modules import without throwing", async () => {
    const modules = await Promise.all([
      import("@/app/today/page"),
      import("@/app/manage/page"),
      import("@/app/cursor/page"),
      import("@/app/journal/page"),
      import("@/app/history/page"),
      import("@/app/attack-mode/page"),
      import("@/app/deadlines/page"),
    ]);
    for (const mod of modules) {
      expect(typeof mod.default).toBe("function");
    }
  });
});
