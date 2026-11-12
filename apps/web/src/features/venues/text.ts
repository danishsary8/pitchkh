"use client";

import { useLocale } from "next-intl";

/** Venue names/descriptions come in both languages from the API; pick the active one. */
export function useVenueText() {
  const locale = useLocale();
  return {
    name: (v: { name: string; nameKm: string }): string => (locale === "km" && v.nameKm ? v.nameKm : v.name),
    description: (v: { description: string; descriptionKm: string }): string => (locale === "km" && v.descriptionKm ? v.descriptionKm : v.description),
  };
}
