import type { Extras, OpponentMode, PaymentMethod, SkillLevel, Sport } from "@pitchkh/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface BookingDraft {
  slug: string;
  /** Sport shown on the pitch map (other sports are faded). */
  sport: Sport | null;
  fieldId: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  teamSize: number | null;
  referee: boolean;
  extras: Extras;
  notes: string;
  opponentMode: OpponentMode;
  matchLevel: SkillLevel;
  paymentMethod: PaymentMethod;
  /** Start time picked from the "time first" chips; colours the map. */
  wantedStart: string | null;
  /** 0 = pick (pitch, day, time), 1 = confirm and pay. */
  step: number;
}

const emptyDraft = (slug: string): BookingDraft => ({
  slug, sport: null, fieldId: null, wantedStart: null, date: null, startTime: null, endTime: null, teamSize: null, referee: false,
  extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have", matchLevel: "intermediate", paymentMethod: "khqr", step: 0,
});

interface DraftState {
  draft: BookingDraft | null;
  /** Starts (or resumes) the draft for a venue. */
  open: (slug: string, initial: Partial<BookingDraft>) => void;
  update: (patch: Partial<BookingDraft>) => void;
  clear: () => void;
}

/**
 * The in-progress booking. Kept in sessionStorage so it survives the trip to
 * the sign-in page and back, and a refresh on a slow connection.
 */
export const useBookingDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      draft: null,
      open: (slug, initial) => {
        const current = get().draft;
        const clean = Object.fromEntries(Object.entries(initial).filter(([, v]) => v !== null && v !== undefined));
        if (current?.slug === slug) {
          // A different field or day in the link restarts the time selection.
          const changed = (clean.fieldId && clean.fieldId !== current.fieldId) || (clean.date && clean.date !== current.date);
          // Drafts saved by the older 4-step flow can carry step 2 or 3.
          const step = Math.min(current.step, 1);
          set({ draft: { ...emptyDraft(slug), ...current, ...clean, step, ...(changed ? { startTime: null, endTime: null, wantedStart: initial.wantedStart ?? null, step: 0 } : {}) } });
        } else set({ draft: { ...emptyDraft(slug), ...clean, step: 0 } });
      },
      update: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
      clear: () => set({ draft: null }),
    }),
    { name: "pitchkh.booking-draft", storage: createJSONStorage(() => sessionStorage) },
  ),
);
