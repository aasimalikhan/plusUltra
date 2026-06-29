import { describe, expect, it } from "vitest";
import {
  DEBRIEF_UI_HOUR,
  EVENING_DEBRIEF_HOUR,
  formatDateISO,
  isDebriefTime,
  isEvening,
  tomorrowDateISO,
} from "@/lib/utils";

describe("Phase 2 · time & day lock helpers", () => {
  it("debrief at 6pm, lock at 11pm", () => {
    expect(DEBRIEF_UI_HOUR).toBe(18);
    expect(EVENING_DEBRIEF_HOUR).toBe(23);
  });

  it("isDebriefTime true at 6pm IST", () => {
    const d = new Date("2026-06-08T12:30:00.000Z");
    expect(isDebriefTime(d)).toBe(true);
    expect(isEvening(d)).toBe(false);
  });

  it("isEvening true at 11pm IST", () => {
    const d = new Date("2026-06-08T17:30:00.000Z");
    expect(isEvening(d)).toBe(true);
    expect(isDebriefTime(d)).toBe(true);
  });

  it("formatDateISO and tomorrowDateISO stay consistent", () => {
    const d = new Date("2026-06-08T15:30:00");
    expect(formatDateISO(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tomorrowDateISO(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
