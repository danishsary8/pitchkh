import { ApiError } from "../../api/errors";
import { round2 } from "../../domain/pricing";
import { slugify } from "../../domain/ids";
import { findLayoutOverlap } from "../../domain/layout";
import { holdsSlot, hoursFor, rangesOverlap } from "../../domain/slots";
import { addDays, dateInPP, durationMinutes, minutesOf, toIso } from "../../domain/time";
import * as s from "../../schemas";
import type { Booking, Field, FieldLayout, OwnerEarnings, Venue } from "../../types";
import type { MockDb } from "../db";
import { notFound, paginate, parse, type MockContext, type MockServer } from "../server";
import { bookingDetail, venueDetail } from "./expand";

const OWNER = ["owner", "admin"] as const;

/** Revenue counts bookings that were actually paid for or played. */
export const earns = (b: Booking): boolean => b.status === "confirmed" || b.status === "completed";

export function dayPoints(bookings: readonly Booking[], today: string, days: number): OwnerEarnings["byDay"] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const rows = bookings.filter((b) => b.date === date && earns(b));
    return { date, bookings: rows.length, revenueUsd: round2(rows.reduce((sum, b) => sum + b.price.subtotalUsd, 0)) };
  });
}

export function registerOwnerRoutes(server: MockServer): void {
  const myVenues = (ctx: MockContext): Venue[] => {
    const user = ctx.requireUser();
    return ctx.db.venues.filter((v) => v.ownerId === user.id);
  };
  const myVenue = (ctx: MockContext, id: string | undefined): Venue => {
    const venue = myVenues(ctx).find((v) => v.id === id);
    if (!venue) throw notFound("Venue");
    return venue;
  };
  const myField = (ctx: MockContext, id: string | undefined): Field => {
    const field = ctx.db.fields.find((f) => f.id === id);
    if (!field || !myVenues(ctx).some((v) => v.id === field.venueId)) throw notFound("Field");
    return field;
  };
  const syncSports = (db: MockDb, venue: Venue): void => {
    const sports = [...new Set(db.fields.filter((f) => f.venueId === venue.id).map((f) => f.sport))];
    if (sports.length > 0) venue.sports = sports;
  };

  server.route("GET", "/owner/venues", OWNER, (ctx) => myVenues(ctx).map((v) => venueDetail(ctx.db, v, ctx.user, ctx.now)));

  server.route("POST", "/owner/venues", OWNER, (ctx) => {
    const user = ctx.requireUser();
    const dto = parse(s.UpsertVenueDto, ctx.body);
    let slug = slugify(dto.name);
    if (ctx.db.venues.some((v) => v.slug === slug)) slug = `${slug}-${ctx.newId().slice(0, 4)}`;
    const venue: Venue = { id: ctx.newId(), ownerId: user.id, slug, ...dto, sports: ["football"], photos: [], phone: dto.phone, rating: 0, reviewCount: 0, verified: false, featured: false, status: "pending", moderationNote: null, createdAt: ctx.nowIso };
    ctx.db.venues.push(venue);
    for (const admin of ctx.db.users.filter((u) => u.role === "admin")) ctx.notify(admin.id, "system", { text: `New venue listing to review: ${venue.name}` }, "/admin/venues");
    return venueDetail(ctx.db, venue, user, ctx.now);
  });

  server.route("PATCH", "/owner/venues/:id", OWNER, (ctx) => {
    const venue = myVenue(ctx, ctx.params.id);
    Object.assign(venue, parse(s.UpsertVenueDto, ctx.body));
    // Editing a rejected listing sends it back for review.
    if (venue.status === "rejected") Object.assign(venue, { status: "pending", moderationNote: null });
    return venueDetail(ctx.db, venue, ctx.user, ctx.now);
  });

  server.route("POST", "/owner/venues/:id/fields", OWNER, (ctx) => {
    const venue = myVenue(ctx, ctx.params.id);
    const dto = parse(s.UpsertFieldDto, ctx.body);
    const sports = new Set([...ctx.db.fields.filter((f) => f.venueId === venue.id).map((f) => f.sport), dto.sport]);
    if (sports.size > 3) throw new ApiError(422, "validation_failed", "A venue offers at most 3 sports.");
    const field: Field = { id: ctx.newId(), venueId: venue.id, ...dto, layout: null };
    ctx.db.fields.push(field);
    syncSports(ctx.db, venue);
    return field;
  });

  server.route("PATCH", "/owner/fields/:id", OWNER, (ctx) => {
    const field = myField(ctx, ctx.params.id);
    const dto = parse(s.UpsertFieldDto, ctx.body);
    // A new size no longer fits the drawn spot: let the map re-place it.
    const resized = dto.sport !== field.sport || dto.format !== field.format;
    Object.assign(field, dto, resized ? { layout: null } : {});
    syncSports(ctx.db, myVenue(ctx, field.venueId));
    return field;
  });

  server.route("PUT", "/owner/venues/:id/layout", OWNER, (ctx) => {
    const venue = myVenue(ctx, ctx.params.id);
    const { items } = parse(s.SaveLayoutDto, ctx.body);
    const fields = ctx.db.fields.filter((f) => f.venueId === venue.id);
    const next = new Map(fields.filter((f) => f.layout).map((f) => [f.id, f.layout as FieldLayout]));
    for (const item of items) {
      if (!fields.some((f) => f.id === item.fieldId)) throw notFound("Field");
      next.set(item.fieldId, item.layout);
    }
    const overlap = findLayoutOverlap([...next].map(([id, layout]) => ({ id, layout })));
    if (overlap) throw new ApiError(422, "validation_failed", "Two pitches overlap on the map.", { layout: overlap });
    for (const f of fields) f.layout = next.get(f.id) ?? f.layout;
    return venueDetail(ctx.db, venue, ctx.user, ctx.now);
  });

  server.route("DELETE", "/owner/fields/:id", OWNER, (ctx) => {
    const field = myField(ctx, ctx.params.id);
    const busy = ctx.db.bookings.some((b) => b.fieldId === field.id && holdsSlot(b) && Date.parse(b.endAt) > ctx.now.getTime());
    if (busy) throw new ApiError(409, "conflict", "This field has upcoming bookings. Set it to maintenance instead.");
    ctx.db.fields = ctx.db.fields.filter((f) => f.id !== field.id);
    syncSports(ctx.db, myVenue(ctx, field.venueId));
    return undefined;
  });

  server.route("GET", "/owner/bookings", OWNER, (ctx) => {
    const q = parse(s.OwnerBookingListQuery, ctx.query);
    const venueIds = new Set(myVenues(ctx).map((v) => v.id));
    const rows = ctx.db.bookings
      .filter((b) => venueIds.has(b.venueId))
      .filter((b) => !q.venueId || b.venueId === q.venueId)
      .filter((b) => !q.status || b.status === q.status)
      .filter((b) => !q.date || b.date === q.date)
      .filter((b) => q.scope === "all" || (q.scope === "upcoming") === Date.parse(b.endAt) > ctx.now.getTime())
      .sort((a, b) => (q.scope === "past" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)))
      .map((b) => bookingDetail(ctx.db, b, ctx.now));
    return paginate(rows, q.page, q.pageSize);
  });

  server.route("POST", "/owner/bookings/:id/decision", OWNER, (ctx) => {
    const { decision } = parse(s.DecideBookingDto, ctx.body);
    const booking = ctx.db.bookings.find((b) => b.id === ctx.params.id);
    if (!booking) throw notFound("Booking");
    const venue = myVenue(ctx, booking.venueId);
    if (booking.status !== "pending") throw new ApiError(409, "conflict", "This request was already answered.");
    booking.status = decision === "accept" ? "confirmed" : "rejected";
    if (decision === "reject") {
      const match = ctx.db.matchRequests.find((m) => m.id === booking.matchRequestId);
      if (match) match.status = "cancelled";
    }
    ctx.notify(booking.userId, decision === "accept" ? "booking_confirmed" : "booking_rejected", { venue: venue.name, code: booking.code }, `/booking/${booking.id}`);
    return bookingDetail(ctx.db, booking, ctx.now);
  });

  server.route("GET", "/owner/schedule", OWNER, (ctx) => {
    const q = parse(s.AvailabilityQuery.extend({ venueId: s.Id }), ctx.query);
    const venue = myVenue(ctx, q.venueId);
    const fields = ctx.db.fields.filter((f) => f.venueId === venue.id);
    const fieldIds = new Set(fields.map((f) => f.id));
    const hours = hoursFor(venue.openingHours, q.date);
    return {
      date: q.date, open: hours.open, close: hours.close, closed: hours.closed, fields,
      bookings: ctx.db.bookings.filter((b) => b.venueId === venue.id && b.date === q.date && holdsSlot(b)).map((b) => bookingDetail(ctx.db, b, ctx.now)),
      blocks: ctx.db.blocks.filter((k) => fieldIds.has(k.fieldId) && k.date === q.date),
    };
  });

  server.route("POST", "/owner/blocks", OWNER, (ctx) => {
    const dto = parse(s.CreateBlockDto, ctx.body);
    const field = myField(ctx, dto.fieldId);
    const start = Date.parse(toIso(dto.date, dto.startTime));
    const end = Date.parse(toIso(dto.date, dto.endTime));
    const clash = ctx.db.bookings.some((b) => b.fieldId === field.id && holdsSlot(b) && rangesOverlap(start, end, Date.parse(b.startAt), Date.parse(b.endAt)));
    if (clash) throw new ApiError(409, "slot_unavailable", "There is a booking in that window. Cancel or move it first.");
    const block = { id: ctx.newId(), ...dto };
    ctx.db.blocks.push(block);
    return block;
  });

  server.route("DELETE", "/owner/blocks/:id", OWNER, (ctx) => {
    const block = ctx.db.blocks.find((k) => k.id === ctx.params.id);
    if (!block) throw notFound("Block");
    myField(ctx, block.fieldId);
    ctx.db.blocks = ctx.db.blocks.filter((k) => k.id !== block.id);
    return undefined;
  });

  server.route("GET", "/owner/earnings", OWNER, (ctx): OwnerEarnings => {
    const venues = myVenues(ctx);
    const venueIds = new Set(venues.map((v) => v.id));
    const all = ctx.db.bookings.filter((b) => venueIds.has(b.venueId));
    const paid = all.filter(earns);
    const today = dateInPP(ctx.now);
    const month = today.slice(0, 7);
    const lastMonth = addDays(`${month}-01`, -1).slice(0, 7);
    const sum = (rows: readonly Booking[]): number => round2(rows.reduce((total, b) => total + b.price.subtotalUsd, 0));
    const fields = ctx.db.fields.filter((f) => venueIds.has(f.venueId));

    // Occupancy: booked minutes / open minutes across all fields, last 14 days.
    let open = 0;
    let booked = 0;
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, -i);
      for (const venue of venues) {
        const hours = hoursFor(venue.openingHours, date);
        if (hours.closed) continue;
        const venueFields = fields.filter((f) => f.venueId === venue.id);
        open += venueFields.length * (minutesOf(hours.close) - minutesOf(hours.open));
        booked += paid.filter((b) => b.venueId === venue.id && b.date === date).reduce((total, b) => total + durationMinutes(b.startAt, b.endAt), 0);
      }
    }
    const bySport = (["football", "volleyball", "tennis"] as const).map((sport) => ({ sport, revenueUsd: sum(paid.filter((b) => b.sport === sport)), bookings: paid.filter((b) => b.sport === sport).length })).filter((x) => x.bookings > 0);
    const byField = fields.map((f) => ({ fieldId: f.id, fieldName: f.name, venueName: venues.find((v) => v.id === f.venueId)?.name ?? "", revenueUsd: sum(paid.filter((b) => b.fieldId === f.id)), bookings: paid.filter((b) => b.fieldId === f.id).length })).sort((a, b) => b.revenueUsd - a.revenueUsd);
    return {
      totalUsd: sum(paid), thisMonthUsd: sum(paid.filter((b) => b.date.startsWith(month))), lastMonthUsd: sum(paid.filter((b) => b.date.startsWith(lastMonth))),
      pendingPayoutUsd: sum(paid.filter((b) => b.paymentMethod !== "cash" && Date.parse(b.endAt) > ctx.now.getTime())),
      bookingsCount: paid.length, pendingRequests: all.filter((b) => b.status === "pending").length, occupancyRate: open ? round2(booked / open) : 0,
      bySport, byField, byDay: dayPoints(all, today, 14),
      byPaymentMethod: (["khqr", "aba", "wing", "cash"] as const).map((method) => ({ method, revenueUsd: sum(paid.filter((b) => b.paymentMethod === method)) })),
    };
  });
}
