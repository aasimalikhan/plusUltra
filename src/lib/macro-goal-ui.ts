/** Slug for DB: uppercase letters, digits, underscores; 2–32 chars. */
export function slugFromTitle(title: string): string {
  const s = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  if (s.length >= 2) return s;
  return `GOAL_${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function normalizeSlugInput(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 32);
}

const PILL: Record<string, string> = {
  RICH: "pill pill-rich",
  MUSCULAR: "pill pill-muscular",
  INTELLIGENT: "pill pill-intelligent",
};

export function macroGoalPillClass(slug: string): string {
  return PILL[slug] ?? "pill";
}
