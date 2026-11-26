import { addDays, APP, dateInPP, minutesOf, rateAt, round2, timeInPP, timeOf } from "@pitchkh/shared";
import { z } from "zod";
import type { Branch } from "./branches";
import type { Field } from "@pitchkh/shared";

/**
 * Booking rules shared by the customer screens (for instant feedback) and the
 * server (which is the one that decides). Keep both sides calling these.
 */

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Lengths a customer can book, in minutes. */
export const DURATIONS = [60, 90, 120, 180] as const;
/** How many days ahead customers can book. */
export const BOOKING_DAYS = 14;

/** What the public availability endpoint returns: when a pitch is taken, nothing personal. */
export interface TakenSlot {
  fieldId: string;
  startMin: number;
  endMin: number;
}

export interface Booking {
  id: string;
  code: string;
  branch: string;
  fieldId: string;
  date: string;
  startMin: number;
  endMin: number;
  status: BookingStatus;
  name: string;
  phone: string;
  players: number;
  note: string;
  priceUsd: number;
  /** "customer" = from the app; "admin" = entered by staff (walk-in, phone call). */
  source: "customer" | "admin";
  telegramUserId: string | null;
  telegramUsername: string | null;
  createdAt: string;
}

/** 1110 -> "18:30" */
export const hhmm = timeOf;

export const overlaps = (a: { startMin: number; endMin: number }, b: { startMin: number; endMin: number }): boolean => a.startMin < b.endMin && b.startMin < a.endMin;

/** Price for a booking, honouring the evening peak rate per half hour. */
export function priceFor(field: Pick<Field, "pricePerHourUsd" | "peakPricePerHourUsd">, startMin: number, endMin: number): number {
  let total = 0;
  for (let m = startMin; m < endMin; m += APP.slotMinutes) total += (rateAt(field, m) * APP.slotMinutes) / 60;
  return round2(total);
}

/** Bookable dates, starting today in Phnom Penh. */
export function bookableDates(now: Date = new Date()): string[] {
  const today = dateInPP(now);
  return Array.from({ length: BOOKING_DAYS }, (_, i) => addDays(today, i));
}

/** Half-hour start times inside opening hours that still leave room for `duration`. */
export function startTimes(branch: Pick<Branch, "open" | "close">, duration: number): number[] {
  const open = minutesOf(branch.open);
  const close = minutesOf(branch.close);
  const times: number[] = [];
  for (let m = open; m + duration <= close; m += APP.slotMinutes) times.push(m);
  return times;
}

/**
 * True if this start is already in the past (Phnom Penh time). `graceMin` lets
 * staff still enter a game that started a little while ago (a walk-in).
 */
export function isPast(date: string, startMin: number, now: Date = new Date(), graceMin = 0): boolean {
  const today = dateInPP(now);
  if (date < today) return true;
  if (date > today) return false;
  return startMin + graceMin <= minutesOf(timeInPP(now));
}

/** How long after a start staff may still record a walk-in. */
export const STAFF_GRACE_MIN = 120;

export function isFieldFree(taken: readonly TakenSlot[], fieldId: string, startMin: number, endMin: number): boolean {
  return !taken.some((t) => t.fieldId === fieldId && overlaps(t, { startMin, endMin }));
}

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .refine((v) => /^\+?\d{8,15}$/.test(v), { message: "phone" });

/** What a customer sends. The server re-checks everything against the branch. */
export const BookingRequest = z.object({
  branch: z.string().min(1).max(40),
  fieldId: z.string().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(24 * 60),
  duration: z.number().int().refine((d) => (DURATIONS as readonly number[]).includes(d)),
  name: z.string().trim().min(1).max(60),
  phone,
  players: z.number().int().min(1).max(40),
  note: z.string().trim().max(300).default(""),
});
export type BookingRequest = z.infer<typeof BookingRequest>;

/** What staff send for a walk-in or phone booking. Phone is optional for them. */
export const AdminBookingRequest = BookingRequest.extend({
  phone: z.union([phone, z.literal("")]).default(""),
  players: z.number().int().min(1).max(40).default(1),
});

export type RuleError = "unknown_field" | "bad_date" | "past" | "outside_hours" | "not_aligned";

/** Checks a request against the branch's calendar rules (not against other bookings). */
export function checkRules(branch: Branch, req: Pick<BookingRequest, "fieldId" | "date" | "startMin" | "duration">, now: Date = new Date(), graceMin = 0): RuleError | null {
  if (!branch.fields.some((f) => f.id === req.fieldId && f.status === "active")) return "unknown_field";
  if (!bookableDates(now).includes(req.date)) return "bad_date";
  if (req.startMin % APP.slotMinutes !== 0) return "not_aligned";
  if (req.startMin < minutesOf(branch.open) || req.startMin + req.duration > minutesOf(branch.close)) return "outside_hours";
  if (isPast(req.date, req.startMin, now, graceMin)) return "past";
  return null;
}

/** Short code customers can quote on Telegram, e.g. "PK-7F3K2". No 0/O/1/I to avoid mix-ups. */
export function bookingCode(random: () => number = Math.random): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(random() * chars.length)];
  return `PK-${out}`;
}
