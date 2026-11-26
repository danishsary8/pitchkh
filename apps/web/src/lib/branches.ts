import type { Field, Sport, Surface } from "@pitchkh/shared";

/**
 * The business's branches. This file is the single place to edit names,
 * addresses, hours, prices and pitches: both the customer screens and the
 * server read it, so a change here is live after the next deploy.
 *
 * The details below are placeholders. Replace them with the real ones.
 */
export interface Branch {
  slug: string;
  name: string;
  nameKm: string;
  district: string;
  address: string;
  /** Google Maps link for "Directions". */
  mapsUrl: string;
  /** Opening hours, every day, Phnom Penh time. Close may be "24:00". */
  open: string;
  close: string;
  photos: string[];
  fields: Field[];
}

const field = (
  branch: string,
  key: string,
  sport: Sport,
  name: string,
  position: string,
  surface: Surface,
  indoor: boolean,
  format: string,
  maxPlayers: number,
  price: number,
  peak: number,
): Field => ({
  id: `${branch}-${key}`,
  venueId: branch,
  sport,
  name,
  position,
  surface,
  indoor,
  format,
  maxPlayers,
  pricePerHourUsd: price,
  peakPricePerHourUsd: peak,
  lit: true,
  status: "active",
  // null = arranged automatically into a tidy plan.
  layout: null,
});

export const BRANCHES: readonly Branch[] = [
  {
    slug: "sen-sok",
    name: "PitchKH Sen Sok",
    nameKm: "PitchKH សែនសុខ",
    district: "Sen Sok, Phnom Penh",
    address: "St 1003, Sangkat Phnom Penh Thmey",
    mapsUrl: "https://maps.google.com/?q=11.599,104.879",
    open: "06:00",
    close: "22:00",
    photos: ["/assets/venues/sen-sok-sports-hub-1.webp", "/assets/venues/sen-sok-sports-hub-2.webp"],
    fields: [
      field("sen-sok", "f1", "football", "Field A", "Outdoor, front", "artificial_turf", false, "7v7", 16, 20, 30),
      field("sen-sok", "f2", "football", "Field B", "Indoor hall", "futsal_court", true, "5v5", 12, 15, 22),
      field("sen-sok", "v1", "volleyball", "Sand Court", "Outdoor, garden side", "sand", false, "4v4", 10, 8, 12),
      field("sen-sok", "t1", "tennis", "Court 1", "Hard court, covered", "hard_court", true, "Singles/Doubles", 4, 11, 15),
    ],
  },
  {
    slug: "toul-kork",
    name: "PitchKH Toul Kork",
    nameKm: "PitchKH ទួលគោក",
    district: "Toul Kork, Phnom Penh",
    address: "St 315, Sangkat Boeung Kak 2",
    mapsUrl: "https://maps.google.com/?q=11.5795,104.8985",
    open: "06:00",
    close: "23:00",
    photos: ["/assets/venues/toul-kork-arena-1.webp", "/assets/venues/toul-kork-arena-2.webp"],
    fields: [
      field("toul-kork", "f1", "football", "Field 1", "Outdoor, main gate", "artificial_turf", false, "7v7", 16, 22, 32),
      field("toul-kork", "f2", "football", "Field 2", "Outdoor, centre", "artificial_turf", false, "7v7", 16, 22, 32),
      field("toul-kork", "v1", "volleyball", "Hall A", "Indoor, ground floor", "parquet", true, "6v6", 14, 12, 18),
      field("toul-kork", "t1", "tennis", "Court 1", "Hard court, back", "hard_court", false, "Singles/Doubles", 4, 10, 14),
    ],
  },
  {
    slug: "bkk",
    name: "PitchKH BKK",
    nameKm: "PitchKH បឹងកេងកង",
    district: "Boeung Keng Kang, Phnom Penh",
    address: "St 322, Sangkat Boeung Keng Kang 1",
    mapsUrl: "https://maps.google.com/?q=11.5515,104.9215",
    open: "06:00",
    close: "23:00",
    photos: ["/assets/venues/bkk-sports-club-1.webp", "/assets/venues/bkk-sports-club-2.webp"],
    fields: [
      field("bkk", "f1", "football", "Field A", "Indoor hall", "futsal_court", true, "5v5", 12, 18, 25),
      field("bkk", "f2", "football", "Field B", "Outdoor, street side", "artificial_turf", false, "7v7", 16, 25, 35),
      field("bkk", "v1", "volleyball", "Court V", "Outdoor, hard floor", "hard_court", false, "6v6", 14, 9, 13),
      field("bkk", "t1", "tennis", "Court 1", "Clay court, west", "clay", false, "Singles/Doubles", 4, 12, 16),
    ],
  },
];

export const findBranch = (slug: string): Branch | undefined => BRANCHES.find((b) => b.slug === slug);

export const findField = (branch: Branch, fieldId: string): Field | undefined => branch.fields.find((f) => f.id === fieldId);

export const branchName = (branch: Branch, locale: string): string => (locale === "km" ? branch.nameKm : branch.name);

export const branchSports = (branch: Branch): Sport[] => [...new Set(branch.fields.map((f) => f.sport))];
