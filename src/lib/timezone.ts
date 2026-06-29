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

export function yesterdayDateISOInTz(d: Date = new Date(), timeZone?: string): string {
  const tz = timeZone ?? getAppTimezone();
  const today = formatDateISOInTz(d, tz);
  const noon = new Date(`${today}T12:00:00`);
  noon.setDate(noon.getDate() - 1);
  return formatDateISOInTz(noon, tz);
}

/** Parse Postgres TIME ("18:00" / "18:00:00") to minutes since midnight. */
export function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((part) => parseInt(part, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Current local time in app timezone as minutes since midnight. */
export function currentMinutesInTz(d: Date = new Date(), timeZone?: string): number {
  const tz = timeZone ?? getAppTimezone();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** True when local time is at or past the profile work cutoff. */
export function isPastWorkCutoff(
  cutoff: string,
  d: Date = new Date(),
  timeZone?: string,
): boolean {
  return currentMinutesInTz(d, timeZone) >= parseTimeToMinutes(cutoff);
}
