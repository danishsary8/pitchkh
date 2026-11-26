import type { Field, Sport } from "@pitchkh/shared";
import { DURATIONS } from "@/lib/booking-rules";

/**
 * Everything a customer has picked on the branch screen. Kept in one reducer
 * so the rules between choices live in one place:
 * - a new day or game length clears the start time (the blocks change);
 * - tapping the chosen time again unpicks it;
 * - a sport filter that hides the chosen pitch unpicks the pitch.
 */
export interface Selection {
  date: string;
  sport: Sport | null;
  duration: number;
  start: number | null;
  fieldId: string | null;
}

export type SelectionAction =
  | { type: "date"; date: string }
  | { type: "sport"; sport: Sport | null; fields: readonly Pick<Field, "id" | "sport">[] }
  | { type: "duration"; duration: number }
  | { type: "start"; start: number }
  | { type: "field"; fieldId: string }
  | { type: "clearField" }
  | { type: "reset" };

export const initialSelection = (date: string): Selection => ({ date, sport: null, duration: DURATIONS[0], start: null, fieldId: null });

export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case "date":
      return action.date === state.date ? state : { ...state, date: action.date, start: null };
    case "duration":
      return action.duration === state.duration ? state : { ...state, duration: action.duration, start: null };
    case "start":
      return { ...state, start: state.start === action.start ? null : action.start };
    case "field":
      return { ...state, fieldId: action.fieldId };
    case "clearField":
      return { ...state, fieldId: null };
    case "sport": {
      const chosen = action.fields.find((f) => f.id === state.fieldId);
      const keepField = !action.sport || !chosen || chosen.sport === action.sport;
      return { ...state, sport: action.sport, fieldId: keepField ? state.fieldId : null };
    }
    case "reset":
      return { ...state, start: null, fieldId: null };
  }
}
