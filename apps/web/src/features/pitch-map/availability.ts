import { APP, type Availability, type VenueAvailability } from "@pitchkh/shared";
import type { PitchState } from "./pitch-shape";

const slotsNeeded = APP.minBookingMinutes / APP.slotMinutes;

/** True if the field has `minBookingMinutes` of free slots starting at `start`. */
export function freeAt(day: Availability, start: string): boolean {
  if (day.closed) return false;
  const i = day.slots.findIndex((s) => s.start === start);
  if (i < 0) return false;
  const window = day.slots.slice(i, i + slotsNeeded);
  return window.length === slotsNeeded && window.every((s) => s.status === "available");
}

/** Has at least one bookable window that day. */
export function hasFreeWindow(day: Availability): boolean {
  return day.slots.some((s) => freeAt(day, s.start));
}

/**
 * Map colours: with a wanted start time, a pitch is free only if it is free
 * then; without one, it is free if anything is left that day.
 */
export function pitchStates(day: VenueAvailability | undefined, wantedStart: string | null): Record<string, PitchState> {
  const states: Record<string, PitchState> = {};
  for (const field of day?.fields ?? []) {
    states[field.fieldId] = (wantedStart ? freeAt(field, wantedStart) : hasFreeWindow(field)) ? "free" : "full";
  }
  return states;
}

export interface StartOption {
  time: string;
  /** How many of the given fields can start a game at this time. */
  freeCount: number;
}

/** Whole-hour start times within opening hours, with how many pitches are free at each. */
export function startOptions(day: VenueAvailability | undefined, fieldIds: ReadonlySet<string>): StartOption[] {
  const fields = (day?.fields ?? []).filter((f) => fieldIds.has(f.fieldId) && !f.closed);
  const times = new Set<string>();
  for (const f of fields) for (const s of f.slots) if (s.start.endsWith(":00") && s.status !== "past") times.add(s.start);
  return [...times].sort().map((time) => ({ time, freeCount: fields.filter((f) => freeAt(f, time)).length })).filter((o, _, all) => all.length > 0 && o !== undefined);
}
