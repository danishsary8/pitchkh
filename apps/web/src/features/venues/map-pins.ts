import type { VenueSummary } from "@pitchkh/shared";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  href?: string;
}

/** Kept apart from the Leaflet component so pages can import it without loading Leaflet (which needs window). */
export const venuesToPins = (venues: readonly VenueSummary[], name: (v: VenueSummary) => string): MapPin[] =>
  venues.map((v) => ({ id: v.id, lat: v.lat, lng: v.lng, label: `$${v.priceFromUsd}`, title: name(v), href: `/venues/${v.slug}` }));
