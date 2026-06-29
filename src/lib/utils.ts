import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatDateISOInTz,
  hourInTz,
  tomorrowDateISOInTz,
} from "@/lib/timezone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Calendar date in IST (Asia/Kolkata) — use everywhere instead of server UTC. */
export function formatDateISO(d: Date = new Date()): string {
  return formatDateISOInTz(d);
}

/** Local hour when the evening debrief panel appears on /today. */
export const DEBRIEF_UI_HOUR = 18;

/** Local hour when pending tasks auto-flip to missed and the day locks. */
export const EVENING_DEBRIEF_HOUR = 23;

export function isDebriefTime(d: Date = new Date()): boolean {
  return hourInTz(d) >= DEBRIEF_UI_HOUR;
}

export function isEvening(d: Date = new Date()): boolean {
  return hourInTz(d) >= EVENING_DEBRIEF_HOUR;
}

export function tomorrowDateISO(d: Date = new Date()): string {
  return tomorrowDateISOInTz(d);
}
