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

/** Local hour when evening debrief starts (auto-miss pending tasks + journal UI). */
export const EVENING_DEBRIEF_HOUR = 23;

export function isEvening(d: Date = new Date()): boolean {
  return hourLocal(d) >= EVENING_DEBRIEF_HOUR;
}
