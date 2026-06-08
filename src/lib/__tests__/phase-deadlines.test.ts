import { describe, expect, it } from "vitest";
import { formatDateISO } from "@/lib/utils";
import {
  daysUntilDate,
  formatDaysUntil,
  importanceLabel,
  milestoneProgress,
  urgencyLabel,
  urgencyScore,
} from "@/lib/deadline-utils";

describe("Phase 2 · deadlines", () => {
  it("milestoneProgress calculates done/total", () => {
    expect(milestoneProgress([{ is_done: true }, { is_done: false }])).toBe(50);
    expect(milestoneProgress([])).toBe(0);
  });

  it("importanceLabel maps 1–5", () => {
    expect(importanceLabel(5)).toBe("Critical");
    expect(importanceLabel(1)).toBe("Minimal");
  });

  it("urgencyLabel buckets by days", () => {
    expect(urgencyLabel(-1)).toBe("overdue");
    expect(urgencyLabel(3)).toBe("critical");
    expect(urgencyLabel(14)).toBe("soon");
    expect(urgencyLabel(30)).toBe("normal");
  });

  it("overdue goals score higher than distant goals", () => {
    const overdue = urgencyScore({ target_date: "2020-01-01", importance: 3 });
    const far = urgencyScore({ target_date: "2030-01-01", importance: 3 });
    expect(overdue).toBeGreaterThan(far);
  });

  it("formatDaysUntil handles overdue and today", () => {
    const today = formatDateISO(new Date());
    expect(formatDaysUntil(today)).toBe("today");
    expect(daysUntilDate("1900-01-01")).toBeLessThan(0);
    expect(formatDaysUntil("1900-01-01")).toContain("overdue");
  });
});
