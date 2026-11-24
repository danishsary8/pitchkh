import { APP } from "../config";
import type { Availability, AvailabilityBlock, Booking, Field, OpeningHours, Slot } from "../types";
import { isPeakMinute, rateAt, round2 } from "./pricing";
import { minutesOf, timeOf, toIso, weekdayOf } from "./time";

/** Bookings in these states hold their time on the field. */
const HOLDING: ReadonlySet<Booking["status"]> = new Set(["awaiting_payment", "pending", "confirmed", "completed"]);
/**
 * Does this booking occupy its time? An unpaid online booking stops holding
 * the slot once its payment deadline passes (pass `now` to check that).
 */
export const holdsSlot = (b: Pick<Booking, "status"> & { paymentDueAt?: string | null }, now?: Date): boolean =>
  HOLDING.has(b.status) && !(b.status === "awaiting_payment" && now && b.paymentDueAt && Date.parse(b.paymentDueAt) <= now.getTime());

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
  const dayStartMs = Date.parse(toIso(input.date, "00:00"));

  // Collect what occupies this field on this day once, as plain numbers, so the
  // per-slot check below is a few comparisons instead of re-parsing every
  // booking's dates for every slot (this runs for many fields at a time when
  // listing venues that are free in a time window).
  const busy: { start: number; end: number; status: Slot["status"] }[] = [];
  for (const b of input.bookings) {
    if (b.fieldId !== input.field.id || b.id === input.excludeBookingId || !holdsSlot(b, input.now)) continue;
    const start = Date.parse(b.startAt);
    const end = Date.parse(b.endAt);
    if (rangesOverlap(start, end, dayStartMs, dayStartMs + 86_400_000)) busy.push({ start, end, status: "booked" });
  }
  for (const k of input.blocks) {
    if (k.fieldId !== input.field.id || k.date !== input.date) continue;
    busy.push({ start: dayStartMs + minutesOf(k.startTime) * 60_000, end: dayStartMs + minutesOf(k.endTime) * 60_000, status: "blocked" });
  }

  const slots: Slot[] = [];
  for (let m = open; m + APP.slotMinutes <= close; m += APP.slotMinutes) {
    const start = timeOf(m);
    const end = timeOf(m + APP.slotMinutes);
    const startMs = dayStartMs + m * 60_000;
    const endMs = startMs + APP.slotMinutes * 60_000;
    const taken = busy.find((x) => rangesOverlap(startMs, endMs, x.start, x.end));
    const status: Slot["status"] = startMs <= nowMs ? "past" : taken ? taken.status : "available";
    slots.push({ start, end, startAt: toIso(input.date, start), endAt: toIso(input.date, end), status, peak: isPeakMinute(m), priceUsd: round2((rateAt(input.field, m) * APP.slotMinutes) / 60) });
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

/** Start times where a game of the shortest bookable length fits (all its slots free). */
export function freeStartTimes(availability: Availability): string[] {
  const need = APP.minBookingMinutes / APP.slotMinutes;
  const { slots } = availability;
  const out: string[] = [];
  for (let i = 0; i + need <= slots.length; i++) {
    if (slots.slice(i, i + need).every((s) => s.status === "available")) out.push((slots[i] as Slot).start);
  }
  return out;
}

/**
 * The next few start times at which at least one of the given availabilities
 * (one per field, same day) has a free game, on the hour or half hour, from `from`.
 */
export function nextFreeStarts(days: readonly Availability[], limit = 3, from = "00:00"): string[] {
  const times = new Set<string>();
  for (const day of days) for (const t of freeStartTimes(day)) if (t >= from) times.add(t);
  return [...times].sort().slice(0, limit);
}
