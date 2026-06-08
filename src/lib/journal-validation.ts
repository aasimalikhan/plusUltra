/** Heuristics for Fix-Not-Fixate journal quality — warn, never block. */

const VAGUE_REPAIR_PATTERNS = [
  /^just\s+(stop|go|do|start)/i,
  /^work harder/i,
  /^be (bold|consistent|regular)$/i,
  /^sleep early$/i,
  /^done\s/i,
  /^fix$/i,
  /^try harder/i,
];

export function isVagueRepair(repair: string): boolean {
  const t = repair.trim();
  if (t.length < 12) return true;
  return VAGUE_REPAIR_PATTERNS.some((p) => p.test(t));
}

export function repairQualityHint(repair: string): string | null {
  const t = repair.trim();
  if (!t) return null;
  if (isVagueRepair(t)) {
    return "Too vague — write one specific, schedulable action (who/what/when). Bad: \"work harder\". Good: \"30 min DSA at 7am before opening Cursor IDE\".";
  }
  return null;
}

/** CBT emotional intensity: how much distress the automatic thought caused (0–100). */
export const EMOTIONAL_IMPACT_GUIDE = {
  label: "Emotional impact",
  hint: "How intensely did this thought hit you? 0 = neutral, 30 = mild annoyance, 60 = real distress, 90+ = spiraling / hard to function. Not guilt — raw intensity.",
  bands: [
    { max: 20, label: "Low" },
    { max: 40, label: "Mild" },
    { max: 60, label: "Moderate" },
    { max: 80, label: "High" },
    { max: 100, label: "Severe" },
  ],
} as const;

export function emotionalImpactBand(value: number): string {
  for (const b of EMOTIONAL_IMPACT_GUIDE.bands) {
    if (value <= b.max) return b.label;
  }
  return "Severe";
}
