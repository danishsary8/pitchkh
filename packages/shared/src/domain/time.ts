/**
 * Time helpers for Asia/Phnom_Penh. Cambodia is UTC+7 all year (no DST), so a
 * fixed offset is exact and keeps this code free of timezone libraries.
 */
import { APP } from "../config";

const pad = (n: number): string => String(n).padStart(2, "0");

/** "18:30" -> 1110 */
export function minutesOf(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** 1110 -> "18:30" */
export function timeOf(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Local date + local time -> ISO-8601 with +07:00 offset. "24:00" rolls to next day. */
export function toIso(date: string, time: string): string {
  if (time === "24:00") return `${addDays(date, 1)}T00:00:00${APP.utcOffset}`;
  return `${date}T${time}:00${APP.utcOffset}`;
}

/** Shifts an instant so its UTC fields read as Phnom Penh wall-clock time. */
function shifted(instant: Date | string): Date {
  const ms = typeof instant === "string" ? Date.parse(instant) : instant.getTime();
  return new Date(ms + APP.utcOffsetMinutes * 60_000);
}

/** Phnom Penh calendar date (YYYY-MM-DD) of an instant. */
export function dateInPP(instant: Date | string): string {
  const d = shifted(instant);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Phnom Penh wall-clock time (HH:mm) of an instant. */
export function timeInPP(instant: Date | string): string {
  const d = shifted(instant);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Instant -> ISO-8601 string with the +07:00 offset. */
export function isoInPP(instant: Date): string {
  const d = shifted(instant);
  return `${dateInPP(instant)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${APP.utcOffset}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isWeekend(date: string): boolean {
  const w = weekdayOf(date);
  return w === 0 || w === 6;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function durationMinutes(startAt: string, endAt: string): number {
  return Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000);
}

/** The next `count` bookable dates starting today (Phnom Penh). */
export function upcomingDates(now: Date, count: number): string[] {
  const today = dateInPP(now);
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}
