import { create } from "zustand";

interface UiState {
  /** Slug + photo of the venue card being opened, for the shared-element transition. */
  transitionVenue: { slug: string; photo: string | null; name: string } | null;
  setTransitionVenue: (venue: UiState["transitionVenue"]) => void;
}

export const useUiStore = create<UiState>((set) => ({
  transitionVenue: null,
  setTransitionVenue: (transitionVenue) => set({ transitionVenue }),
}));
