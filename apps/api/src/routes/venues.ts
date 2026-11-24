import { ApiError, generateSlots, holdsSlot, schemas as s, weatherHintFor, type Field, type Venue, type VenueSummary } from "@pitchkh/shared";
import { notFound, paginate, parse, type TimeWindow } from "@pitchkh/shared/mock";
import { and, arrayContains, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import type { Tx } from "../db/client";
import { toBlock, toBooking, toField, toVenue } from "../db/mappers";
import * as t from "../db/schema";
import type { Route } from "../http";
import { findVenue, venueDetailOf, venueSummaries } from "../views";

/** One field's slot grid for a day, from the bookings and blocks in the database. */
export async function availabilityOf(db: Tx, field: Field, venue: Venue, date: string, now: Date, excludeBookingId?: string) {
  const bookings = (await db.select().from(t.bookings).where(and(eq(t.bookings.fieldId, field.id), eq(t.bookings.date, date)))).map(toBooking).filter((b) => holdsSlot(b, now));
  const blocks = (await db.select().from(t.blocks).where(and(eq(t.blocks.fieldId, field.id), eq(t.blocks.date, date)))).map(toBlock);
  return generateSlots({ field, openingHours: venue.openingHours, date, bookings, blocks, now, excludeBookingId });
}

export async function findField(db: Tx, id: string): Promise<Field> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Field");
  const [row] = await db.select().from(t.fields).where(eq(t.fields.id, id));
  if (!row) throw notFound("Field");
  return toField(row);
}

export function registerVenueRoutes(route: Route): void {
  route("GET", "/venues", "public", async ({ db, query, user, now }) => {
    const q = parse(s.VenueListQuery, query);
    const window: TimeWindow | undefined = q.date && q.from && q.to ? { date: q.date, from: q.from, to: q.to } : undefined;

    // Cheap filters run in SQL; price and "free in a window" need the computed summary.
    const where: SQL[] = [eq(t.venues.status, "approved")];
    if (q.sport) where.push(arrayContains(t.venues.sports, [q.sport]));
    if (q.province) where.push(eq(t.venues.province, q.province));
    if (q.district) where.push(eq(t.venues.district, q.district));
    if (q.featured !== undefined) where.push(eq(t.venues.featured, q.featured));
    if (q.q) {
      const like = `%${q.q.replace(/[%_\\]/g, "\\$&")}%`;
      where.push(or(ilike(t.venues.name, like), ilike(t.venues.nameKm, like), ilike(t.venues.district, like), ilike(t.venues.address, like)) as SQL);
    }
    if (q.favorites) {
      if (!user) return paginate([], q.page, q.pageSize);
      const favs = await db.select({ venueId: t.favorites.venueId }).from(t.favorites).where(eq(t.favorites.userId, user.id));
      if (favs.length === 0) return paginate([], q.page, q.pageSize);
      where.push(inArray(t.venues.id, favs.map((f) => f.venueId)));
    }
    const venues = (await db.select().from(t.venues).where(and(...where))).map(toVenue);
    let rows: VenueSummary[] = await venueSummaries(db, venues, user, now, window);

    // Price filters compare against the cheapest field of the chosen sport.
    if (q.sport) {
      const fields = await db.select().from(t.fields).where(and(inArray(t.fields.venueId, venues.length ? venues.map((v) => v.id) : ["00000000-0000-0000-0000-000000000000"]), eq(t.fields.sport, q.sport), eq(t.fields.status, "active")));
      rows = rows.map((v) => {
        const prices = fields.filter((f) => f.venueId === v.id).map((f) => f.pricePerHourUsd);
        return prices.length ? { ...v, priceFromUsd: Math.min(...prices) } : v;
      });
    }
    rows = rows
      .filter((v) => q.minPrice === undefined || v.priceFromUsd >= q.minPrice)
      .filter((v) => q.maxPrice === undefined || v.priceFromUsd <= q.maxPrice)
      .filter((v) => !window || (v.availableFieldCount ?? 0) > 0);

    const score = (v: VenueSummary): number => (v.featured ? 2 : 0) + (v.verified ? 1 : 0) + v.rating / 5;
    const sorters: Record<typeof q.sort, (a: VenueSummary, b: VenueSummary) => number> = {
      recommended: (a, b) => score(b) - score(a),
      price_asc: (a, b) => a.priceFromUsd - b.priceFromUsd,
      price_desc: (a, b) => b.priceFromUsd - a.priceFromUsd,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return paginate(rows.sort(sorters[q.sort]), q.page, q.pageSize);
  });

  route("GET", "/venues/:id", "public", async ({ db, params, user, now }) => {
    const venue = await findVenue(db, params.id ?? "");
    const canSeeUnapproved = user && (user.role === "admin" || user.id === venue.ownerId);
    if (venue.status !== "approved" && !canSeeUnapproved) throw notFound("Venue");
    return venueDetailOf(db, venue, user, now);
  });

  route("GET", "/venues/:id/availability", "public", async ({ db, params, query, now }) => {
    const { date } = parse(s.AvailabilityQuery, query);
    const venue = await findVenue(db, params.id ?? "");
    const fields = (await db.select().from(t.fields).where(eq(t.fields.venueId, venue.id))).map(toField);
    const ids = fields.map((f) => f.id);
    const bookings = ids.length ? (await db.select().from(t.bookings).where(and(inArray(t.bookings.fieldId, ids), eq(t.bookings.date, date)))).map(toBooking).filter((b) => holdsSlot(b, now)) : [];
    const blocks = ids.length ? (await db.select().from(t.blocks).where(and(inArray(t.blocks.fieldId, ids), eq(t.blocks.date, date)))).map(toBlock) : [];
    return { venueId: venue.id, date, fields: fields.map((field) => generateSlots({ field, openingHours: venue.openingHours, date, bookings, blocks, now })) };
  });

  route("GET", "/fields/:id/availability", "public", async ({ db, params, query, now }) => {
    const { date } = parse(s.AvailabilityQuery, query);
    const field = await findField(db, params.id ?? "");
    return availabilityOf(db, field, await findVenue(db, field.venueId), date, now);
  });

  route("GET", "/weather", "public", ({ query }) => {
    const q = parse(s.WeatherQuery, query);
    return weatherHintFor(q.province, q.date);
  });

  route("PUT", "/favorites/:venueId", "auth", async ({ db, params, requireUser }) => {
    const user = requireUser();
    const venue = await findVenue(db, params.venueId ?? "");
    await db.insert(t.favorites).values({ userId: user.id, venueId: venue.id }).onConflictDoNothing();
    return { venueId: venue.id, isFavorite: true };
  });

  route("DELETE", "/favorites/:venueId", "auth", async ({ db, params, requireUser }) => {
    const user = requireUser();
    // 200 with a body (not 204): the client reads isFavorite back.
    if (/^[0-9a-f-]{36}$/i.test(params.venueId ?? "")) await db.delete(t.favorites).where(and(eq(t.favorites.userId, user.id), eq(t.favorites.venueId, params.venueId ?? "")));
    return { venueId: params.venueId, isFavorite: false };
  });

  route("POST", "/reports", "auth", async ({ db, body, requireUser, now, newId }) => {
    const user = requireUser();
    const dto = parse(s.CreateReportDto, body);
    const [open] = await db.select({ id: t.reports.id }).from(t.reports).where(and(eq(t.reports.reporterId, user.id), eq(t.reports.targetId, dto.targetId), eq(t.reports.status, "open")));
    if (open) throw new ApiError(409, "conflict", "You already reported this. Our team is reviewing it.");
    const id = newId();
    await db.insert(t.reports).values({ id, reporterId: user.id, ...dto, status: "open", resolution: null, createdAt: now });
    return { id };
  });
}
