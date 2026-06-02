import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateISO(d: Date = new Date()): string {
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

export function hourLocal(d: Date = new Date()): number {
  return d.getHours();
}

/** Local hour when the evening debrief panel appears on /today. */
export const DEBRIEF_UI_HOUR = 18;

/** Local hour when pending tasks auto-flip to missed and the day locks. */
export const EVENING_DEBRIEF_HOUR = 23;

export function isDebriefTime(d: Date = new Date()): boolean {
  return hourLocal(d) >= DEBRIEF_UI_HOUR;
}

export function isEvening(d: Date = new Date()): boolean {
  return hourLocal(d) >= EVENING_DEBRIEF_HOUR;
}

export function tomorrowDateISO(d: Date = new Date()): string {
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return formatDateISO(next);
}
