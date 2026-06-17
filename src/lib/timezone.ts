import { getAppTimezone } from "@/lib/analysis-env";

/** Calendar date (YYYY-MM-DD) in the app's configured timezone. */
export function formatDateISOInTz(d: Date = new Date(), timeZone?: string): string {
  const tz = timeZone ?? getAppTimezone();
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

/** Local hour (0–23) in the app's configured timezone. */
export function hourInTz(d: Date = new Date(), timeZone?: string): number {
  const tz = timeZone ?? getAppTimezone();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export function tomorrowDateISOInTz(d: Date = new Date(), timeZone?: string): string {
  const tz = timeZone ?? getAppTimezone();
  const today = formatDateISOInTz(d, tz);
  const noon = new Date(`${today}T12:00:00`);
  noon.setDate(noon.getDate() + 1);
  return formatDateISOInTz(noon, tz);
}
