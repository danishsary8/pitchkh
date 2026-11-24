/**
 * Read models. Each function loads only the rows a response needs, puts them in
 * the same shape the mock backend works on, and runs the shared joins from
 * @pitchkh/shared/mock (venueSummary, venueDetail, bookingDetail). That keeps
 * slot, price and summary rules in one tested place for both backends.
 */
import { addDays, ApiError, dateInPP, holdsSlot, type Booking, type BookingDetail, type User, type Venue, type VenueDetail, type VenueSummary } from "@pitchkh/shared";
import { bookingDetail, venueDetail, venueSummary, type MockDb, type TimeWindow } from "@pitchkh/shared/mock";
import { and, eq, inArray, or } from "drizzle-orm";
import type { Tx } from "./db/client";
import { toBlock, toBooking, toField, toUser, toVenue } from "./db/mappers";
import * as t from "./db/schema";

/** An empty mock-shaped snapshot; loaders fill the tables they need. */
export function emptySnapshot(): MockDb {
  return {
    version: 0, seededAt: "", users: [], passwords: {}, teams: [], venues: [], fields: [], bookings: [], blocks: [],
    matchRequests: [], joinRequests: [], conversations: [], messages: [], reviews: [], favorites: [], notifications: [], reports: [], payments: [], resetTokens: {},
  };
}

export async function findVenue(db: Tx, idOrSlug: string): Promise<Venue> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const [row] = await db.select().from(t.venues).where(isUuid ? or(eq(t.venues.id, idOrSlug), eq(t.venues.slug, idOrSlug)) : eq(t.venues.slug, idOrSlug));
  if (!row) throw new ApiError(404, "not_found", "Venue not found.");
  return toVenue(row);
}

/**
 * Loads fields, the bookings and blocks on the given days, and the user's
 * favorites for a set of venues: everything venueSummary needs.
 */
async function venueSnapshot(db: Tx, venues: Venue[], user: User | null, days: string[]): Promise<MockDb> {
  const snap = emptySnapshot();
  snap.venues = venues;
  if (venues.length === 0) return snap;
  const venueIds = venues.map((v) => v.id);
  snap.fields = (await db.select().from(t.fields).where(inArray(t.fields.venueId, venueIds))).map(toField);
  const fieldIds = snap.fields.map((f) => f.id);
  if (fieldIds.length && days.length) {
    snap.bookings = (await db.select().from(t.bookings).where(and(inArray(t.bookings.fieldId, fieldIds), inArray(t.bookings.date, days)))).map(toBooking).filter((b) => holdsSlot(b));
    snap.blocks = (await db.select().from(t.blocks).where(and(inArray(t.blocks.fieldId, fieldIds), inArray(t.blocks.date, days)))).map(toBlock);
  }
  if (user) {
    snap.favorites = (await db.select().from(t.favorites).where(and(eq(t.favorites.userId, user.id), inArray(t.favorites.venueId, venueIds)))).map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }));
  }
  return snap;
}

/** The days a summary looks at: the filter day, or today and tomorrow for "next free". */
const summaryDays = (now: Date, window?: TimeWindow): string[] => (window ? [window.date] : [dateInPP(now), addDays(dateInPP(now), 1)]);

export async function venueSummaries(db: Tx, venues: Venue[], user: User | null, now: Date, window?: TimeWindow): Promise<VenueSummary[]> {
  const snap = await venueSnapshot(db, venues, user, summaryDays(now, window));
  return venues.map((v) => venueSummary(snap, v, user, now, window));
}

export async function venueDetails(db: Tx, venues: Venue[], user: User | null, now: Date): Promise<VenueDetail[]> {
  const snap = await venueSnapshot(db, venues, user, summaryDays(now));
  const ownerIds = [...new Set(venues.map((v) => v.ownerId))];
  if (ownerIds.length) snap.users = (await db.select().from(t.users).where(inArray(t.users.id, ownerIds))).map(toUser);
  return venues.map((v) => venueDetail(snap, v, user, now));
}

export async function venueDetailOf(db: Tx, venue: Venue, user: User | null, now: Date): Promise<VenueDetail> {
  return (await venueDetails(db, [venue], user, now))[0] as VenueDetail;
}

/** Bookings with their venue, field and customer joined in. */
export async function bookingDetails(db: Tx, bookings: Booking[], now: Date): Promise<BookingDetail[]> {
  if (bookings.length === 0) return [];
  const snap = emptySnapshot();
  const venueIds = [...new Set(bookings.map((b) => b.venueId))];
  const fieldIds = [...new Set(bookings.map((b) => b.fieldId))];
  const userIds = [...new Set(bookings.map((b) => b.userId))];
  snap.venues = (await db.select().from(t.venues).where(inArray(t.venues.id, venueIds))).map(toVenue);
  snap.fields = (await db.select().from(t.fields).where(inArray(t.fields.id, fieldIds))).map(toField);
  snap.users = (await db.select().from(t.users).where(inArray(t.users.id, userIds))).map(toUser);
  return bookings.map((b) => bookingDetail(snap, b, now));
}

export async function bookingDetailOf(db: Tx, booking: Booking, now: Date): Promise<BookingDetail> {
  return (await bookingDetails(db, [booking], now))[0] as BookingDetail;
}
