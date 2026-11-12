import type { Extras, OpponentMode, PaymentMethod, SkillLevel } from "@pitchkh/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface BookingDraft {
  slug: string;
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
  step: number;
}

const emptyDraft = (slug: string): BookingDraft => ({
  slug, fieldId: null, date: null, startTime: null, endTime: null, teamSize: null, referee: false,
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
          set({ draft: { ...current, ...clean, ...(changed ? { startTime: null, endTime: null, step: clean.fieldId ? 1 : 0 } : {}) } });
        } else set({ draft: { ...emptyDraft(slug), ...clean, step: clean.fieldId ? 1 : 0 } });
      },
      update: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
      clear: () => set({ draft: null }),
    }),
    { name: "pitchkh.booking-draft", storage: createJSONStorage(() => sessionStorage) },
  ),
);
