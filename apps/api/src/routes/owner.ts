import { addDays, ApiError, dateInPP, durationMinutes, findLayoutOverlap, holdsSlot, hoursFor, minutesOf, rangesOverlap, round2, schemas as s, slugify, toIso, type Booking, type Field, type FieldLayout, type OwnerEarnings, type Venue } from "@pitchkh/shared";
import { dayPoints, earns, notFound, paginate, parse } from "@pitchkh/shared/mock";
import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "../db/client";
import { toBlock, toBooking, toField, toVenue } from "../db/mappers";
import * as t from "../db/schema";
import type { Ctx, Route } from "../http";
import { bookingDetailOf, bookingDetails, venueDetailOf, venueDetails } from "../views";
import { findField } from "./venues";

const OWNER = ["owner", "admin"] as const;
const isId = (v: string | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

async function myVenues(ctx: Ctx, tx: Tx = ctx.db): Promise<Venue[]> {
  return (await tx.select().from(t.venues).where(eq(t.venues.ownerId, ctx.requireUser().id))).map(toVenue);
}
async function myVenue(ctx: Ctx, id: string | undefined, tx: Tx = ctx.db): Promise<Venue> {
  if (!isId(id)) throw notFound("Venue");
  const [row] = await tx.select().from(t.venues).where(and(eq(t.venues.id, id), eq(t.venues.ownerId, ctx.requireUser().id)));
  if (!row) throw notFound("Venue");
  return toVenue(row);
}
async function myField(ctx: Ctx, id: string | undefined, tx: Tx = ctx.db): Promise<{ field: Field; venue: Venue }> {
  if (!isId(id)) throw notFound("Field");
  const field = await findField(tx, id).catch(() => null);
  if (!field) throw notFound("Field");
  const venue = await myVenue(ctx, field.venueId, tx).catch(() => null);
  if (!venue) throw notFound("Field");
  return { field, venue };
}
/** venue.sports is derived from its pitches. */
async function syncSports(tx: Tx, venueId: string): Promise<void> {
  const sports = [...new Set((await tx.select({ sport: t.fields.sport }).from(t.fields).where(eq(t.fields.venueId, venueId))).map((f) => f.sport))];
  if (sports.length) await tx.update(t.venues).set({ sports }).where(eq(t.venues.id, venueId));
}

export function registerOwnerRoutes(route: Route): void {
  route("GET", "/owner/venues", OWNER, async (ctx) => venueDetails(ctx.db, await myVenues(ctx), ctx.user, ctx.now));

  route("POST", "/owner/venues", OWNER, async (ctx) => {
    const user = ctx.requireUser();
    const dto = parse(s.UpsertVenueDto, ctx.body);
    const venue = await ctx.db.transaction(async (tx) => {
      let slug = slugify(dto.name);
      const [taken] = await tx.select({ id: t.venues.id }).from(t.venues).where(eq(t.venues.slug, slug));
      if (taken) slug = `${slug}-${ctx.newId().slice(0, 4)}`;
      const [row] = await tx.insert(t.venues).values({
        id: ctx.newId(), ownerId: user.id, slug, ...dto, sports: ["football"], photos: [], rating: 0, reviewCount: 0, verified: false, featured: false, status: "pending", moderationNote: null, createdAt: ctx.now,
      }).returning();
      for (const admin of await tx.select({ id: t.users.id }).from(t.users).where(eq(t.users.role, "admin"))) {
        await ctx.notify(tx, admin.id, "system", { text: `New venue listing to review: ${dto.name}` }, "/admin/venues");
      }
      return toVenue(row as typeof t.venues.$inferSelect);
    });
    return venueDetailOf(ctx.db, venue, user, ctx.now);
  });

  route("PATCH", "/owner/venues/:id", OWNER, async (ctx) => {
    const venue = await myVenue(ctx, ctx.params.id);
    const dto = parse(s.UpsertVenueDto, ctx.body);
    // Editing a rejected listing sends it back for review.
    const review = venue.status === "rejected" ? { status: "pending" as const, moderationNote: null } : {};
    const [row] = await ctx.db.update(t.venues).set({ ...dto, ...review }).where(eq(t.venues.id, venue.id)).returning();
    return venueDetailOf(ctx.db, toVenue(row as typeof t.venues.$inferSelect), ctx.user, ctx.now);
  });

  route("POST", "/owner/venues/:id/fields", OWNER, async (ctx) => {
    const venue = await myVenue(ctx, ctx.params.id);
    const dto = parse(s.UpsertFieldDto, ctx.body);
    return ctx.db.transaction(async (tx) => {
      const sports = new Set([...(await tx.select({ sport: t.fields.sport }).from(t.fields).where(eq(t.fields.venueId, venue.id))).map((f) => f.sport), dto.sport]);
      if (sports.size > 3) throw new ApiError(422, "validation_failed", "A venue offers at most 3 sports.");
      const [row] = await tx.insert(t.fields).values({ id: ctx.newId(), venueId: venue.id, ...dto, layout: null }).returning();
      await syncSports(tx, venue.id);
      return toField(row as typeof t.fields.$inferSelect);
    });
  });

  route("PATCH", "/owner/fields/:id", OWNER, async (ctx) => {
    const { field, venue } = await myField(ctx, ctx.params.id);
    const dto = parse(s.UpsertFieldDto, ctx.body);
    // A new size no longer fits the drawn spot: let the map re-place it.
    const resized = dto.sport !== field.sport || dto.format !== field.format;
    return ctx.db.transaction(async (tx) => {
      const [row] = await tx.update(t.fields).set({ ...dto, ...(resized ? { layout: null } : {}) }).where(eq(t.fields.id, field.id)).returning();
      await syncSports(tx, venue.id);
      return toField(row as typeof t.fields.$inferSelect);
    });
  });

  route("PUT", "/owner/venues/:id/layout", OWNER, async (ctx) => {
    const venue = await myVenue(ctx, ctx.params.id);
    const { items } = parse(s.SaveLayoutDto, ctx.body);
    await ctx.db.transaction(async (tx) => {
      const fields = (await tx.select().from(t.fields).where(eq(t.fields.venueId, venue.id)).for("update")).map(toField);
      const next = new Map(fields.filter((f) => f.layout).map((f) => [f.id, f.layout as FieldLayout]));
      for (const item of items) {
        if (!fields.some((f) => f.id === item.fieldId)) throw notFound("Field");
        next.set(item.fieldId, item.layout);
      }
      const overlap = findLayoutOverlap([...next].map(([id, layout]) => ({ id, layout })));
      if (overlap) throw new ApiError(422, "validation_failed", "Two pitches overlap on the map.", { layout: overlap });
      for (const item of items) await tx.update(t.fields).set({ layout: item.layout }).where(eq(t.fields.id, item.fieldId));
    });
    return venueDetailOf(ctx.db, venue, ctx.user, ctx.now);
  });

  route("DELETE", "/owner/fields/:id", OWNER, async (ctx) => {
    const { field, venue } = await myField(ctx, ctx.params.id);
    await ctx.db.transaction(async (tx) => {
      const history = (await tx.select().from(t.bookings).where(eq(t.bookings.fieldId, field.id))).map(toBooking);
      if (history.some((b) => holdsSlot(b) && Date.parse(b.endAt) > ctx.now.getTime())) throw new ApiError(409, "conflict", "This pitch has upcoming bookings. Set it to maintenance instead.");
      // Receipts point at the pitch, so a pitch with any booking history is kept.
      if (history.length) throw new ApiError(409, "conflict", "This pitch has past bookings on record. Set it to maintenance instead.");
      await tx.delete(t.fields).where(eq(t.fields.id, field.id));
      await syncSports(tx, venue.id);
    });
    return undefined;
  });

  route("GET", "/owner/bookings", OWNER, async (ctx) => {
    const q = parse(s.OwnerBookingListQuery, ctx.query);
    const venueIds = (await myVenues(ctx)).map((v) => v.id);
    if (venueIds.length === 0) return paginate([], q.page, q.pageSize);
    const where = [inArray(t.bookings.venueId, venueIds)];
    if (q.venueId) where.push(eq(t.bookings.venueId, q.venueId));
    if (q.status) where.push(eq(t.bookings.status, q.status));
    if (q.date) where.push(eq(t.bookings.date, q.date));
    const rows = (await ctx.db.select().from(t.bookings).where(and(...where)))
      .map(toBooking)
      .filter((b) => q.scope === "all" || (q.scope === "upcoming") === Date.parse(b.endAt) > ctx.now.getTime())
      .sort((a, b) => (q.scope === "past" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)));
    const page = paginate(rows, q.page, q.pageSize);
    return { ...page, data: await bookingDetails(ctx.db, page.data, ctx.now) };
  });

  route("POST", "/owner/bookings/:id/decision", OWNER, async (ctx) => {
    const { decision } = parse(s.DecideBookingDto, ctx.body);
    const booking = await decideBooking(ctx, ctx.params.id, decision);
    return bookingDetailOf(ctx.db, booking, ctx.now);
  });

  route("GET", "/owner/schedule", OWNER, async (ctx) => {
    const q = parse(s.AvailabilityQuery.extend({ venueId: s.Id }), ctx.query);
    const venue = await myVenue(ctx, q.venueId);
    const fields = (await ctx.db.select().from(t.fields).where(eq(t.fields.venueId, venue.id))).map(toField);
    const fieldIds = fields.map((f) => f.id);
    const hours = hoursFor(venue.openingHours, q.date);
    const bookings = (await ctx.db.select().from(t.bookings).where(and(eq(t.bookings.venueId, venue.id), eq(t.bookings.date, q.date)))).map(toBooking).filter(holdsSlot);
    return {
      date: q.date, open: hours.open, close: hours.close, closed: hours.closed, fields,
      bookings: await bookingDetails(ctx.db, bookings, ctx.now),
      blocks: fieldIds.length ? (await ctx.db.select().from(t.blocks).where(and(inArray(t.blocks.fieldId, fieldIds), eq(t.blocks.date, q.date)))).map(toBlock) : [],
    };
  });

  route("POST", "/owner/blocks", OWNER, async (ctx) => {
    const dto = parse(s.CreateBlockDto, ctx.body);
    const { field } = await myField(ctx, dto.fieldId);
    const start = Date.parse(toIso(dto.date, dto.startTime));
    const end = Date.parse(toIso(dto.date, dto.endTime));
    return ctx.db.transaction(async (tx) => {
      const day = (await tx.select().from(t.bookings).where(and(eq(t.bookings.fieldId, field.id), eq(t.bookings.date, dto.date)))).map(toBooking);
      if (day.some((b) => holdsSlot(b) && rangesOverlap(start, end, Date.parse(b.startAt), Date.parse(b.endAt)))) throw new ApiError(409, "slot_unavailable", "There is a booking in that window. Cancel or move it first.");
      const [row] = await tx.insert(t.blocks).values({ id: ctx.newId(), ...dto }).returning();
      return toBlock(row as typeof t.blocks.$inferSelect);
    });
  });

  route("DELETE", "/owner/blocks/:id", OWNER, async (ctx) => {
    if (!isId(ctx.params.id)) throw notFound("Block");
    const [block] = await ctx.db.select().from(t.blocks).where(eq(t.blocks.id, ctx.params.id));
    if (!block) throw notFound("Block");
    await myField(ctx, block.fieldId);
    await ctx.db.delete(t.blocks).where(eq(t.blocks.id, block.id));
    return undefined;
  });

  route("GET", "/owner/earnings", OWNER, async (ctx): Promise<OwnerEarnings> => {
    const venues = await myVenues(ctx);
    const venueIds = venues.map((v) => v.id);
    const all = venueIds.length ? (await ctx.db.select().from(t.bookings).where(inArray(t.bookings.venueId, venueIds))).map(toBooking) : [];
    const fields = venueIds.length ? (await ctx.db.select().from(t.fields).where(inArray(t.fields.venueId, venueIds))).map(toField) : [];
    return earnings(venues, fields, all, ctx.now);
  });
}

/** Accept or reject a pending request. Shared with the Telegram buttons. */
export async function decideBooking(ctx: Pick<Ctx, "db" | "notify" | "requireUser">, id: string | undefined, decision: "accept" | "reject"): Promise<Booking> {
  if (!isId(id)) throw notFound("Booking");
  const user = ctx.requireUser();
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx.select().from(t.bookings).where(eq(t.bookings.id, id)).for("update");
    if (!row) throw notFound("Booking");
    const [venue] = await tx.select().from(t.venues).where(and(eq(t.venues.id, row.venueId), eq(t.venues.ownerId, user.id)));
    if (!venue) throw notFound("Booking");
    if (row.status !== "pending") throw new ApiError(409, "conflict", "This request was already answered.");
    const [updated] = await tx.update(t.bookings).set({ status: decision === "accept" ? "confirmed" : "rejected" }).where(eq(t.bookings.id, id)).returning();
    await ctx.notify(tx, row.userId, decision === "accept" ? "booking_confirmed" : "booking_rejected", { venue: venue.name, code: row.code }, `/booking/${row.id}`);
    return toBooking(updated as typeof t.bookings.$inferSelect);
  });
}

/** Same numbers as the mock's /owner/earnings. */
function earnings(venues: Venue[], fields: Field[], all: Booking[], now: Date): OwnerEarnings {
  const paid = all.filter(earns);
  const today = dateInPP(now);
  const month = today.slice(0, 7);
  const lastMonth = addDays(`${month}-01`, -1).slice(0, 7);
  const sum = (rows: readonly Booking[]): number => round2(rows.reduce((total, b) => total + b.price.subtotalUsd, 0));
  let open = 0;
  let booked = 0;
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, -i);
    for (const venue of venues) {
      const hours = hoursFor(venue.openingHours, date);
      if (hours.closed) continue;
      open += fields.filter((f) => f.venueId === venue.id).length * (minutesOf(hours.close) - minutesOf(hours.open));
      booked += paid.filter((b) => b.venueId === venue.id && b.date === date).reduce((total, b) => total + durationMinutes(b.startAt, b.endAt), 0);
    }
  }
  const bySport = (["football", "volleyball", "tennis"] as const).map((sport) => ({ sport, revenueUsd: sum(paid.filter((b) => b.sport === sport)), bookings: paid.filter((b) => b.sport === sport).length })).filter((x) => x.bookings > 0);
  const byField = fields.map((f) => ({ fieldId: f.id, fieldName: f.name, venueName: venues.find((v) => v.id === f.venueId)?.name ?? "", revenueUsd: sum(paid.filter((b) => b.fieldId === f.id)), bookings: paid.filter((b) => b.fieldId === f.id).length })).sort((a, b) => b.revenueUsd - a.revenueUsd);
  return {
    totalUsd: sum(paid), thisMonthUsd: sum(paid.filter((b) => b.date.startsWith(month))), lastMonthUsd: sum(paid.filter((b) => b.date.startsWith(lastMonth))),
    pendingPayoutUsd: sum(paid.filter((b) => b.paymentMethod !== "cash" && Date.parse(b.endAt) > now.getTime())),
    bookingsCount: paid.length, pendingRequests: all.filter((b) => b.status === "pending").length, occupancyRate: open ? round2(booked / open) : 0,
    bySport, byField, byDay: dayPoints(all, today, 14),
    byPaymentMethod: (["khqr", "aba", "wing", "cash"] as const).map((method) => ({ method, revenueUsd: sum(paid.filter((b) => b.paymentMethod === method)) })),
  };
}
