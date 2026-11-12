import { APP } from "../config";
import type { Availability, AvailabilityBlock, Booking, Field, OpeningHours, Slot } from "../types";
import { isPeakMinute, rateAt, round2 } from "./pricing";
import { minutesOf, timeOf, toIso, weekdayOf } from "./time";

/** Bookings in these states hold their time on the field. */
const HOLDING: ReadonlySet<Booking["status"]> = new Set(["pending", "confirmed", "completed"]);
export const holdsSlot = (b: Pick<Booking, "status">): boolean => HOLDING.has(b.status);

/** Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd). Touching ranges do not overlap. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function hoursFor(openingHours: readonly OpeningHours[], date: string): OpeningHours {
  const weekday = weekdayOf(date);
  return openingHours.find((h) => h.weekday === weekday) ?? { weekday, open: "06:00", close: "22:00", closed: true };
}

export interface ConflictInput {
  fieldId: string;
  startAt: string;
  endAt: string;
  bookings: readonly Booking[];
  blocks: readonly AvailabilityBlock[];
  /** Ignore this booking (used when rescheduling). */
  excludeBookingId?: string;
}

export type Conflict = { kind: "booking"; bookingId: string } | { kind: "block"; blockId: string };

/** Returns the first thing occupying the requested time on that field, or null when it is free. */
export function findConflict(input: ConflictInput): Conflict | null {
  const start = Date.parse(input.startAt);
  const end = Date.parse(input.endAt);
  for (const b of input.bookings) {
    if (b.fieldId !== input.fieldId || b.id === input.excludeBookingId || !holdsSlot(b)) continue;
    if (rangesOverlap(start, end, Date.parse(b.startAt), Date.parse(b.endAt))) return { kind: "booking", bookingId: b.id };
  }
  for (const k of input.blocks) {
    if (k.fieldId !== input.fieldId) continue;
    if (rangesOverlap(start, end, Date.parse(toIso(k.date, k.startTime)), Date.parse(toIso(k.date, k.endTime)))) {
      return { kind: "block", blockId: k.id };
    }
  }
  return null;
}

export interface SlotInput {
  field: Field;
  openingHours: readonly OpeningHours[];
  date: string;
  bookings: readonly Booking[];
  blocks: readonly AvailabilityBlock[];
  now: Date;
  excludeBookingId?: string;
}

/** Builds the day's slot grid for one field, marking each slot available/booked/blocked/past. */
export function generateSlots(input: SlotInput): Availability {
  const hours = hoursFor(input.openingHours, input.date);
  const base = { fieldId: input.field.id, date: input.date, open: hours.open, close: hours.close };
  if (hours.closed || input.field.status !== "active") return { ...base, closed: true, slots: [] };

  const open = minutesOf(hours.open);
  const close = minutesOf(hours.close);
  const nowMs = input.now.getTime();
  const slots: Slot[] = [];

  for (let m = open; m + APP.slotMinutes <= close; m += APP.slotMinutes) {
    const start = timeOf(m);
    const end = timeOf(m + APP.slotMinutes);
    const startAt = toIso(input.date, start);
    const endAt = toIso(input.date, end);
    const conflict = findConflict({ fieldId: input.field.id, startAt, endAt, bookings: input.bookings, blocks: input.blocks, excludeBookingId: input.excludeBookingId });
    const status: Slot["status"] = Date.parse(startAt) <= nowMs ? "past" : conflict === null ? "available" : conflict.kind === "booking" ? "booked" : "blocked";
    slots.push({ start, end, startAt, endAt, status, peak: isPeakMinute(m), priceUsd: round2((rateAt(input.field, m) * APP.slotMinutes) / 60) });
  }
  return { ...base, closed: false, slots };
}

export type RangeError = "too_short" | "too_long" | "unavailable" | "outside_hours" | "not_aligned";

/** Validates a requested from..to range against a day's slot grid. Returns null when bookable. */
export function validateRange(availability: Availability, startTime: string, endTime: string): RangeError | null {
  const start = minutesOf(startTime);
  const end = minutesOf(endTime);
  if (start % APP.slotMinutes !== 0 || end % APP.slotMinutes !== 0) return "not_aligned";
  if (end - start < APP.minBookingMinutes) return "too_short";
  if (end - start > APP.maxBookingMinutes) return "too_long";
  if (availability.closed || start < minutesOf(availability.open) || end > minutesOf(availability.close)) return "outside_hours";
  const covered = availability.slots.filter((s) => minutesOf(s.start) >= start && minutesOf(s.end) <= end);
  if (covered.length !== (end - start) / APP.slotMinutes) return "outside_hours";
  return covered.every((s) => s.status === "available") ? null : "unavailable";
}

/**
 * Slot-grid selection helper: given the tapped slot indexes, returns the
 * contiguous range to select. Tapping a second slot extends the range unless an
 * unavailable slot sits in between, in which case the selection restarts there.
 */
export function selectRange(slots: readonly Slot[], anchor: number | null, tapped: number): { from: number; to: number } {
  if (anchor === null) return { from: tapped, to: tapped };
  const from = Math.min(anchor, tapped);
  const to = Math.max(anchor, tapped);
  const maxSlots = APP.maxBookingMinutes / APP.slotMinutes;
  const blocked = slots.slice(from, to + 1).some((s) => s.status !== "available");
  if (blocked || to - from + 1 > maxSlots) return { from: tapped, to: tapped };
  return { from, to };
}

/** Free fields of a venue for a given window (used by the "available at" filter). */
export function isFieldFree(input: Omit<SlotInput, "excludeBookingId">, startTime: string, endTime: string): boolean {
  return validateRange(generateSlots(input), startTime, endTime) === null;
}
