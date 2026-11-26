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
  layout: Field["layout"] = null,
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
  // Where it sits on the site plan, in metres (null = arranged automatically).
  layout,
});

/**
 * The same 8 pitches at every branch for now: one 10v10, two 6v6, an indoor
 * 5v5 hall, two volleyball and two tennis courts, laid out as one compact site.
 * Ids stay stable (f1 = Field A, f2 = Field B, v1, t1), so existing bookings
 * keep pointing at the same pitch.
 */
const standardPitches = (b: string): Field[] => [
  field(b, "f1", "football", "Field A", "Main pitch, floodlit", "artificial_turf", false, "10v10", 24, 40, 55, { x: 4, y: 4, w: 75, h: 48 }),
  field(b, "f2", "football", "Field B", "Beside the main pitch", "artificial_turf", false, "6v6", 14, 18, 26, { x: 83, y: 4, w: 36, h: 22 }),
  field(b, "f3", "football", "Field C", "Beside the main pitch", "artificial_turf", false, "6v6", 14, 18, 26, { x: 83, y: 30, w: 36, h: 22 }),
  field(b, "f4", "football", "Field D", "Indoor hall", "futsal_court", true, "5v5", 12, 15, 22, { x: 4, y: 56, w: 30, h: 18 }),
  field(b, "v1", "volleyball", "Volleyball 1", "Outdoor, sand", "sand", false, "4v4", 10, 8, 12, { x: 40, y: 56, w: 18, h: 9 }),
  field(b, "v2", "volleyball", "Volleyball 2", "Outdoor, sand", "sand", false, "4v4", 10, 8, 12, { x: 40, y: 69, w: 18, h: 9 }),
  field(b, "t1", "tennis", "Tennis 1", "Hard court", "hard_court", false, "Singles/Doubles", 4, 10, 14, { x: 64, y: 56, w: 23.77, h: 10.97 }),
  field(b, "t2", "tennis", "Tennis 2", "Hard court", "hard_court", false, "Singles/Doubles", 4, 10, 14, { x: 93, y: 56, w: 23.77, h: 10.97 }),
];

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
    fields: standardPitches("sen-sok"),
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
    fields: standardPitches("toul-kork"),
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
    fields: standardPitches("bkk"),
  },
];

export const findBranch = (slug: string): Branch | undefined => BRANCHES.find((b) => b.slug === slug);

export const findField = (branch: Branch, fieldId: string): Field | undefined => branch.fields.find((f) => f.id === fieldId);

export const branchName = (branch: Branch, locale: string): string => (locale === "km" ? branch.nameKm : branch.name);

export const branchSports = (branch: Branch): Sport[] => [...new Set(branch.fields.map((f) => f.sport))];
