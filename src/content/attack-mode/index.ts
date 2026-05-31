import { MODULE_1_CHUNKS } from "./module-1";
import { MODULE_2_CHUNKS } from "./module-2";
import { MODULE_5_CHUNKS } from "./module-5";
import { SECTION_5_CHUNKS } from "./section-5-system";
import type { AttackModeChunk } from "./types";

export type { AttackModeChunk, AttackModeSearchResult } from "./types";

export const ATTACK_MODE_CHUNKS: AttackModeChunk[] = [
  ...MODULE_1_CHUNKS,
  ...MODULE_2_CHUNKS,
  ...MODULE_5_CHUNKS,
  ...SECTION_5_CHUNKS,
];

export const ATTACK_MODE_SECTIONS = [
  { id: "section-1", label: "Section 1", modules: ["Module 1", "Module 2", "Module 5"] },
  { id: "section-5", label: "Section 5", modules: ["System"] },
] as const;

export function getChunksBySection(section: string): AttackModeChunk[] {
  return ATTACK_MODE_CHUNKS.filter((c) => c.section === section);
}

export function getChunksByModule(module: string): AttackModeChunk[] {
  return ATTACK_MODE_CHUNKS.filter((c) => c.module === module);
}

export function getUniqueModules(): string[] {
  return [...new Set(ATTACK_MODE_CHUNKS.map((c) => c.module))];
}
