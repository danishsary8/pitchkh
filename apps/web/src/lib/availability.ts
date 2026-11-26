import type { Field, Sport } from "@pitchkh/shared";
import { blockStarts, isFieldFree, isPast, type TakenSlot } from "./booking-rules";
import type { Branch } from "./branches";

/**
 * What the customer screens show, worked out from the branch, the chosen day
 * and length, and the public "taken" feed. Pure functions: no React, no fetch,
 * so they are tested directly and the server can never disagree on a rule.
 */

export type PitchAvailability = "free" | "full";

export interface TimeOption {
  startMin: number;
  endMin: number;
  /** Pitches (of the chosen sport) free for the whole block. */
  freeCount: number;
}

export const pitchesFor = (branch: Branch, sport: Sport | null): Field[] => branch.fields.filter((f) => !sport || f.sport === sport);

/** The blocks a customer can still pick that day, with how many pitches are free in each. */
export function timeOptions(branch: Branch, fields: readonly Field[], date: string, duration: number, taken: readonly TakenSlot[], now: Date = new Date()): TimeOption[] {
  return blockStarts(branch, duration)
    .filter((startMin) => !isPast(date, startMin, now))
    .map((startMin) => ({
      startMin,
      endMin: startMin + duration,
      freeCount: fields.filter((f) => isFieldFree(taken, f.id, startMin, startMin + duration)).length,
    }));
}

/**
 * Colour of each pitch on the map. With a start time: free for that block or
 * not. Without one: free if any block is still open that day.
 */
export function pitchAvailability(fields: readonly Field[], taken: readonly TakenSlot[], start: number | null, duration: number, options: readonly TimeOption[]): Record<string, PitchAvailability> {
  const states: Record<string, PitchAvailability> = {};
  for (const f of fields) {
    const free = start !== null ? isFieldFree(taken, f.id, start, start + duration) : options.some((o) => isFieldFree(taken, f.id, o.startMin, o.endMin));
    states[f.id] = free ? "free" : "full";
  }
  return states;
}

/** What the customer still has to do, as a translation key under `book.branch`. */
export type NextStep = "hintBoth" | "hintPitch" | "hintTime" | "hintTaken" | null;

export function nextStep(fieldId: string | null, start: number | null, states: Record<string, PitchAvailability>): NextStep {
  if (!fieldId && start === null) return "hintBoth";
  if (!fieldId) return "hintPitch";
  if (start === null) return "hintTime";
  if (states[fieldId] !== "free") return "hintTaken";
  return null;
}
