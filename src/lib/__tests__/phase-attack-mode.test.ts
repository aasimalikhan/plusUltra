import { describe, expect, it } from "vitest";
import { ATTACK_MODE_CHUNKS } from "@/content/attack-mode";
import {
  ATTACK_MODE_SECTIONS,
  chunkModuleLabel,
  DISPLAY_TO_CHUNK_MODULE,
} from "@/content/attack-mode/sections";
import { getAllTags, searchAttackMode } from "@/lib/attack-mode-search";

describe("Phase 4 · attack mode content", () => {
  it("has chunks with required fields", () => {
    expect(ATTACK_MODE_CHUNKS.length).toBeGreaterThan(10);
    for (const c of ATTACK_MODE_CHUNKS) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.content.length).toBeGreaterThan(20);
      expect(c.section).toBeTruthy();
      expect(c.module).toBeTruthy();
    }
  });

  it("sections map to real chunk section ids", () => {
    const sectionIds = new Set(ATTACK_MODE_CHUNKS.map((c) => c.section));
    for (const s of ATTACK_MODE_SECTIONS) {
      expect(sectionIds.has(s.id)).toBe(true);
    }
  });

  it("display module labels round-trip", () => {
    expect(chunkModuleLabel("Module 1")).toBe("Discipline & clarity");
    expect(DISPLAY_TO_CHUNK_MODULE["Discipline & clarity"]).toBe("Module 1");
  });

  it("search returns results for known topics", () => {
    const results = searchAttackMode("journal", 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet.length).toBeGreaterThan(0);
  });

  it("search empty query returns nothing", () => {
    expect(searchAttackMode("")).toEqual([]);
  });

  it("tags are populated", () => {
    expect(getAllTags().length).toBeGreaterThan(5);
  });
});
