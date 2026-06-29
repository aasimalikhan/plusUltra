import type { CursorPlan, FrictionLevel } from "@/lib/db-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FRICTION_LEVELS = new Set([1, 2, 3]);

function parseFrictionLevel(value: unknown): FrictionLevel | null {
  if (value === undefined || value === null) return 1;
  const n = Number(value);
  if (!Number.isInteger(n) || !FRICTION_LEVELS.has(n)) return null;
  return n as FrictionLevel;
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function validateUuidList(
  label: string,
  ids: unknown,
): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (ids === undefined) return { ok: true, ids: [] };
  if (!Array.isArray(ids))
    return { ok: false, error: `${label} must be an array of full UUID strings` };
  const out: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = String(ids[i] ?? "").trim();
    if (!isUuid(id)) {
      return {
        ok: false,
        error: `${label}[${i}] "${id}" is not a full UUID — copy the exact id from LIVE DATA (e.g. b022c94e-3aa5-495f-a671-fd20b2794d17), not a short prefix`,
      };
    }
    out.push(id);
  }
  return { ok: true, ids: out };
}

/** Strip ```json fences and parse analyst JSON output. */
export function parseCursorPlanJson(
  raw: string,
): { ok: true; parsed: unknown } | { ok: false; error: string } {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  try {
    return { ok: true, parsed: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function validateCursorPlan(
  input: unknown,
  allowedSlugs: Set<string>,
): { ok: true; plan: CursorPlan } | { ok: false; error: string } {
  if (!input || typeof input !== "object")
    return { ok: false, error: "not an object" };
  const p = input as Record<string, unknown>;
  if (typeof p.summary !== "string")
    return { ok: false, error: "summary must be a string" };
  if (!Array.isArray(p.tomorrow_tasks))
    return { ok: false, error: "tomorrow_tasks must be an array" };
  let frogCount = 0;
  for (const t of p.tomorrow_tasks) {
    if (!t || typeof t !== "object")
      return { ok: false, error: "tomorrow_tasks item not object" };
    const tt = t as Record<string, unknown>;
    const slug = String(tt.macro_goal_slug ?? "").toUpperCase();
    if (!allowedSlugs.has(slug))
      return {
        ok: false,
        error: `unknown macro_goal_slug "${slug}" — use: ${[...allowedSlugs].join(", ")}`,
      };
    if (typeof tt.task_name !== "string" || !tt.task_name.trim())
      return { ok: false, error: "missing task_name" };
    const cat = tt.category === "work" ? "work" : "personal";
    if (cat === "work" && tt.work_client !== undefined) {
      const wc = String(tt.work_client);
      if (wc !== "verizon" && wc !== "freelance") {
        return {
          ok: false,
          error: `work_client must be "verizon" or "freelance" when category is work`,
        };
      }
    }
    if (
      tt.is_anti_task !== undefined &&
      typeof tt.is_anti_task !== "boolean"
    ) {
      return { ok: false, error: "is_anti_task must be a boolean when present" };
    }
    const friction = parseFrictionLevel(tt.friction_level);
    if (friction === null) {
      return {
        ok: false,
        error: "friction_level must be 1, 2, or 3 when present",
      };
    }
    if (friction === 3) frogCount++;
  }
  if (frogCount > 2) {
    return {
      ok: false,
      error: `at most 2 friction_level: 3 tasks allowed per day (found ${frogCount})`,
    };
  }

  const citedJ = validateUuidList("cited_journal_ids", p.cited_journal_ids);
  if (!citedJ.ok) return citedJ;
  const citedT = validateUuidList("cited_task_ids", p.cited_task_ids);
  if (!citedT.ok) return citedT;

  const rc = p.rule_changes;
  if (rc && typeof rc === "object") {
    const rco = rc as Record<string, unknown>;
    if (rco.demote !== undefined) {
      if (!Array.isArray(rco.demote))
        return { ok: false, error: "rule_changes.demote must be an array" };
      for (let i = 0; i < rco.demote.length; i++) {
        const d = rco.demote[i] as Record<string, unknown> | null;
        const id = String(d?.id ?? "").trim();
        if (!isUuid(id)) {
          return {
            ok: false,
            error: `rule_changes.demote[${i}].id "${id}" is not a full UUID`,
          };
        }
      }
    }
    const deactivate = validateUuidList(
      "rule_changes.deactivate",
      rco.deactivate,
    );
    if (!deactivate.ok) return deactivate;
  }

  return { ok: true, plan: p as unknown as CursorPlan };
}

export function parseAndValidateCursorPlan(
  raw: string,
  allowedSlugs: Set<string>,
): { ok: true; plan: CursorPlan } | { ok: false; error: string } {
  const parsed = parseCursorPlanJson(raw);
  if (!parsed.ok) return parsed;
  return validateCursorPlan(parsed.parsed, allowedSlugs);
}
