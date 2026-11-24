import { z } from "zod";
import { AMENITIES, VENUE_SORTS } from "../enums";
import { DateStr, Id, IsoDateTime, PageQuery, Province, QueryBool, Sport, TimeStr } from "./common";
import { Field } from "./field";

export { AMENITIES, VENUE_SORTS };

export const Amenity = z.enum(AMENITIES);

export const VenueStatus = z.enum(["pending", "approved", "rejected", "suspended"]);

export const OpeningHours = z.object({
  /** 0 = Sunday ... 6 = Saturday */
  weekday: z.number().int().min(0).max(6),
  open: TimeStr,
  close: TimeStr,
  closed: z.boolean(),
});

export const Venue = z.object({
  id: Id,
  ownerId: Id,
  slug: z.string(),
  name: z.string().min(3).max(80),
  nameKm: z.string().max(120),
  description: z.string().max(1200),
  descriptionKm: z.string().max(2000),
  province: Province,
  district: z.string().min(2).max(60),
  address: z.string().min(4).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  sports: z.array(Sport).min(1).max(3),
  photos: z.array(z.string()),
  amenities: z.array(Amenity),
  openingHours: z.array(OpeningHours).length(7),
  phone: z.string(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int(),
  verified: z.boolean(),
  featured: z.boolean(),
  status: VenueStatus,
  /** Admin note shown to the owner when a listing is rejected. */
  moderationNote: z.string().nullable(),
  createdAt: IsoDateTime,
});

/** List item: venue plus computed fields the cards need. */
export const VenueSummary = Venue.extend({
  priceFromUsd: z.number(),
  fieldCount: z.number().int(),
  isFavorite: z.boolean(),
  /** Present when the list was filtered by date/time: free fields in that window. */
  availableFieldCount: z.number().int().nullable(),
  /** Active pitches grouped by sport and format, biggest group first: "3 × 6v6". */
  pitchFormats: z.array(z.object({ sport: Sport, format: z.string(), count: z.number().int() })),
  /**
   * The next start times with at least one free pitch (shortest game), so a
   * card can offer "19:00" as a one-tap booking. Today, or tomorrow when
   * today is done. Uses the list's `date`/`from` filter when given.
   */
  nextFree: z.object({ date: DateStr, times: z.array(TimeStr) }).nullable(),
});

export const VenueDetail = VenueSummary.extend({
  fields: z.array(Field),
  owner: z.object({ id: Id, name: z.string() }),
});


export const VenueListQuery = PageQuery.extend({
  q: z.string().trim().optional(),
  sport: Sport.optional(),
  province: Province.optional(),
  district: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  /** With from/to: only venues with at least one free field in that window. */
  date: DateStr.optional(),
  from: TimeStr.optional(),
  to: TimeStr.optional(),
  featured: QueryBool.optional(),
  favorites: QueryBool.optional(),
  sort: z.enum(VENUE_SORTS).default("recommended"),
});

export const UpsertVenueDto = z.object({
  name: z.string().min(3).max(80),
  nameKm: z.string().max(120).default(""),
  description: z.string().min(10).max(1200),
  descriptionKm: z.string().max(2000).default(""),
  province: Province,
  district: z.string().min(2).max(60),
  address: z.string().min(4).max(200),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  phone: z.string().min(8).max(20),
  amenities: z.array(Amenity),
  openingHours: z.array(OpeningHours).length(7),
});

export const ModerateVenueDto = z.object({
  status: z.enum(["approved", "rejected", "suspended"]),
  note: z.string().max(400).optional(),
});

export const FeatureVenueDto = z.object({ featured: z.boolean() });

/** Max photos per venue; the first one is the cover. */
export const MAX_VENUE_PHOTOS = 8;
/** A photo as a data URL (JPEG/PNG/WebP). The web app shrinks it before sending. */
export const UploadPhotoDto = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/, "Only JPEG, PNG or WebP images").max(6_000_000),
});
/** The venue's photos in their new order; leaving one out deletes it. */
export const SetPhotosDto = z.object({ photos: z.array(z.string()).max(MAX_VENUE_PHOTOS) });
