/** Human-readable module labels (content files still use legacy Module N ids internally). */
export const ATTACK_MODE_MODULE_LABELS: Record<string, string> = {
  "Module 1": "Discipline & clarity",
  "Module 2": "Logical brain & philosophy",
  "Module 5": "Pointed journaling & CBT",
  System: "Daily operating system",
};

export const ATTACK_MODE_SECTIONS = [
  {
    id: "Section 1",
    label: "Philosophy",
    modules: ["Discipline & clarity", "Logical brain & philosophy", "Pointed journaling & CBT"],
  },
  {
    id: "Section 5",
    label: "Operating system",
    modules: ["Daily operating system"],
  },
] as const;

/** Map display module label back to chunk module field. */
export const DISPLAY_TO_CHUNK_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(ATTACK_MODE_MODULE_LABELS).map(([k, v]) => [v, k]),
);

export function chunkModuleLabel(module: string): string {
  return ATTACK_MODE_MODULE_LABELS[module] ?? module;
}
