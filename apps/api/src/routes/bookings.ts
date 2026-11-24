import { ApiError, bookingCode, calculatePrice, canCancel, canReschedule, initialBookingState, isUpcoming, isWithinBookingWindow, refundStatus, schemas as s, supportsMatching, toIso, validateRange, type Booking, type Field, type Venue } from "@pitchkh/shared";
import { notFound, paginate, parse } from "@pitchkh/shared/mock";
import { and, eq } from "drizzle-orm";
import type { Tx } from "../db/client";
import { toBooking } from "../db/mappers";
import * as t from "../db/schema";
import type { Ctx, Route } from "../http";
import { bookingDetailOf, bookingDetails, findVenue } from "../views";
import { availabilityOf, findField } from "./venues";

/** Shared by create and reschedule: the range must be in the window, aligned and free. */
export async function assertBookable(tx: Tx, now: Date, field: Field, venue: Venue, date: string, startTime: string, endTime: string, excludeBookingId?: string): Promise<void> {
  if (venue.status !== "approved") throw new ApiError(409, "conflict", "This venue is not accepting bookings.");
  if (!isWithinBookingWindow(date, now)) throw new ApiError(422, "outside_booking_window", "Bookings open up to 30 days ahead.", { date: ["Outside the booking window"] });
  const problem = validateRange(await availabilityOf(tx, field, venue, date, now, excludeBookingId), startTime, endTime);
  if (problem === "unavailable") throw new ApiError(409, "slot_unavailable", "That time was just taken. Pick another slot.");
  if (problem) throw new ApiError(422, "validation_failed", "That time range cannot be booked.", { startTime: [problem] });
}

/** The booking, if the signed-in user is its customer, the venue's owner, or an admin. */
async function ownBooking(ctx: Ctx, tx: Tx = ctx.db): Promise<{ booking: Booking; venue: Venue }> {
  const user = ctx.requireUser();
  const id = ctx.params.id ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Booking");
  // FOR UPDATE: cancel/reschedule of the same booking run one at a time.
  const [row] = await tx.select().from(t.bookings).where(eq(t.bookings.id, id)).for("update");
  if (!row) throw notFound("Booking");
  const booking = toBooking(row);
  const venue = await findVenue(tx, booking.venueId);
  if (booking.userId !== user.id && venue.ownerId !== user.id && user.role !== "admin") throw new ApiError(403, "forbidden", "This booking belongs to someone else.");
  return { booking, venue };
}

export function registerBookingRoutes(route: Route): void {
  route("POST", "/bookings/quote", "public", async ({ db, body }) => {
    const dto = parse(s.QuoteDto, body);
    return calculatePrice({ field: await findField(db, dto.fieldId), ...dto });
  });

  route("POST", "/bookings", "auth", async (ctx) => {
    const user = ctx.requireUser();
    const dto = parse(s.CreateBookingDto, ctx.body);
    const booking = await ctx.db.transaction(async (tx) => {
      const field = await findField(tx, dto.fieldId);
      const venue = await findVenue(tx, field.venueId);
      await assertBookable(tx, ctx.now, field, venue, dto.date, dto.startTime, dto.endTime);
      if (dto.teamSize > field.maxPlayers) throw new ApiError(422, "validation_failed", "Team is too large for this field.", { teamSize: [`Maximum ${field.maxPlayers} players`] });
      const state = initialBookingState(dto.paymentMethod);
      // The no-overlap constraint is the final word: a parallel booking that got here first makes this insert fail with 409.
      const [row] = await tx.insert(t.bookings).values({
        id: ctx.newId(), code: bookingCode(), userId: user.id, venueId: venue.id, fieldId: field.id, sport: field.sport, date: dto.date,
        startAt: new Date(toIso(dto.date, dto.startTime)), endAt: new Date(toIso(dto.date, dto.endTime)), teamSize: dto.teamSize, referee: dto.referee, extras: dto.extras, notes: dto.notes,
        // Match requests arrive in v1.1; the choice is kept so the owner sees it.
        opponentMode: dto.opponentMode === "find" && supportsMatching(field.sport) ? "find" : "have", matchRequestId: null,
        price: calculatePrice({ field, ...dto }), paymentMethod: dto.paymentMethod, paymentStatus: state.paymentStatus, status: state.status, createdAt: ctx.now, cancelledAt: null,
      }).returning();
      const created = toBooking(row as typeof t.bookings.$inferSelect);
      const type = created.status === "confirmed" ? "booking_confirmed" : "booking_pending";
      await ctx.notify(tx, user.id, type, { venue: venue.name, code: created.code }, `/booking/${created.id}`);
      await ctx.notify(tx, venue.ownerId, type, { venue: venue.name, customer: user.name, code: created.code }, "/owner/bookings", { bookingId: created.id });
      return created;
    });
    return bookingDetailOf(ctx.db, booking, ctx.now);
  });

  route("GET", "/bookings", "auth", async ({ db, query, requireUser, now }) => {
    const user = requireUser();
    const q = parse(s.BookingListQuery, query);
    const where = [eq(t.bookings.userId, user.id)];
    if (q.status) where.push(eq(t.bookings.status, q.status));
    const rows = (await db.select().from(t.bookings).where(and(...where)))
      .map(toBooking)
      .filter((b) => q.scope === "all" || (q.scope === "upcoming") === isUpcoming(b, now))
      .sort((a, b) => (q.scope === "upcoming" ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt)));
    const page = paginate(rows, q.page, q.pageSize);
    return { ...page, data: await bookingDetails(db, page.data, now) };
  });

  route("GET", "/bookings/:id", "auth", async (ctx) => bookingDetailOf(ctx.db, (await ownBooking(ctx)).booking, ctx.now));

  route("POST", "/bookings/:id/cancel", "auth", async (ctx) => {
    const updated = await ctx.db.transaction(async (tx) => {
      const { booking, venue } = await ownBooking(ctx, tx);
      if (!canCancel(booking, ctx.now)) throw new ApiError(409, "cancellation_window_passed", "Bookings can be cancelled up to 2 hours before the start.");
      const [row] = await tx.update(t.bookings).set({ status: "cancelled", cancelledAt: ctx.now, paymentStatus: refundStatus(booking) }).where(eq(t.bookings.id, booking.id)).returning();
      await ctx.notify(tx, venue.ownerId, "booking_cancelled", { venue: venue.name, code: booking.code }, "/owner/bookings", { bookingId: booking.id });
      return toBooking(row as typeof t.bookings.$inferSelect);
    });
    return bookingDetailOf(ctx.db, updated, ctx.now);
  });

  route("POST", "/bookings/:id/reschedule", "auth", async (ctx) => {
    const dto = parse(s.RescheduleBookingDto, ctx.body);
    const updated = await ctx.db.transaction(async (tx) => {
      const { booking, venue } = await ownBooking(ctx, tx);
      if (!canReschedule(booking, ctx.now)) throw new ApiError(409, "cancellation_window_passed", "Bookings can be changed up to 2 hours before the start.");
      const field = await findField(tx, booking.fieldId);
      await assertBookable(tx, ctx.now, field, venue, dto.date, dto.startTime, dto.endTime, booking.id);
      const [row] = await tx.update(t.bookings).set({
        date: dto.date, startAt: new Date(toIso(dto.date, dto.startTime)), endAt: new Date(toIso(dto.date, dto.endTime)),
        price: calculatePrice({ field, date: dto.date, startTime: dto.startTime, endTime: dto.endTime, referee: booking.referee, extras: booking.extras }),
      }).where(eq(t.bookings.id, booking.id)).returning();
      await ctx.notify(tx, venue.ownerId, "booking_rescheduled", { venue: venue.name, code: booking.code }, "/owner/bookings", { bookingId: booking.id });
      return toBooking(row as typeof t.bookings.$inferSelect);
    });
    return bookingDetailOf(ctx.db, updated, ctx.now);
  });
}
