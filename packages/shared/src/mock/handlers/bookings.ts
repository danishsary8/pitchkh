import { ApiError } from "../../api/errors";
import { bookingCode } from "../../domain/ids";
import { calculatePrice } from "../../domain/pricing";
import { defaultTeamSize, initialBookingState, isUpcoming, isWithinBookingWindow, refundStatus, supportsMatching, canCancel, canReschedule } from "../../domain/rules";
import { newPaymentIntent } from "../../domain/payments";
import { generateSlots, holdsSlot, validateRange } from "../../domain/slots";
import { toIso } from "../../domain/time";
import * as s from "../../schemas";
import type { Booking, Field, MatchRequest, PaymentIntent, Venue } from "../../types";
import type { MockDb } from "../db";
import { notFound, paginate, parse, type MockContext, type MockServer } from "../server";
import { bookingDetail, getVenue } from "./expand";

function getField(db: MockDb, id: string): Field {
  const field = db.fields.find((f) => f.id === id);
  if (!field) throw notFound("Field");
  return field;
}

/** Shared by create and reschedule: the range must be inside the window, aligned and free. */
export function assertBookable(ctx: MockContext, field: Field, venue: Venue, date: string, startTime: string, endTime: string, excludeBookingId?: string): void {
  if (venue.status !== "approved") throw new ApiError(409, "conflict", "This venue is not accepting bookings.");
  if (!isWithinBookingWindow(date, ctx.now)) throw new ApiError(422, "outside_booking_window", "Bookings open up to 30 days ahead.", { date: ["Outside the booking window"] });
  const availability = generateSlots({ field, openingHours: venue.openingHours, date, bookings: ctx.db.bookings, blocks: ctx.db.blocks, now: ctx.now, excludeBookingId });
  const problem = validateRange(availability, startTime, endTime);
  if (problem === "unavailable") throw new ApiError(409, "slot_unavailable", "That time was just taken. Pick another slot.");
  if (problem) throw new ApiError(422, "validation_failed", "That time range cannot be booked.", { startTime: [problem] });
}

/** The provider said "paid": confirm the booking (once) and tell both sides. */
function confirmPayment(ctx: MockContext, intent: MockDb["payments"][number]): void {
  if (intent.status === "paid") return;
  intent.status = "paid";
  intent.paidAt = ctx.nowIso;
  const booking = ctx.db.bookings.find((b) => b.id === intent.bookingId);
  if (!booking) return;
  if (booking.status !== "awaiting_payment") {
    // Paid after the hold ran out or after cancelling: the money goes back.
    booking.paymentStatus = "refunded";
    return;
  }
  Object.assign(booking, { status: "confirmed", paymentStatus: "paid", paymentDueAt: null });
  const venue = getVenue(ctx.db, booking.venueId);
  const customer = ctx.db.users.find((u) => u.id === booking.userId);
  ctx.notify(booking.userId, "booking_confirmed", { venue: venue.name, code: booking.code }, `/booking/${booking.id}`);
  ctx.notify(venue.ownerId, "booking_confirmed", { venue: venue.name, customer: customer?.name ?? "", code: booking.code }, "/owner/bookings");
}

const intentOut = (ctx: MockContext, intent: MockDb["payments"][number]): PaymentIntent => ({
  ...intent,
  status: intent.status === "pending" && Date.parse(intent.expiresAt) <= ctx.now.getTime() ? "expired" : intent.status,
  bookingStatus: ctx.db.bookings.find((b) => b.id === intent.bookingId)?.status ?? "cancelled",
});

export function registerBookingRoutes(server: MockServer): void {
  server.route("POST", "/bookings/quote", "public", ({ db, body }) => {
    const dto = parse(s.QuoteDto, body);
    return calculatePrice({ field: getField(db, dto.fieldId), ...dto });
  });

  server.route("POST", "/bookings", "auth", (ctx) => {
    const { db, body, nowIso, newId } = ctx;
    const user = ctx.requireUser();
    const dto = parse(s.CreateBookingDto, body);
    const field = getField(db, dto.fieldId);
    const venue = getVenue(db, field.venueId);
    assertBookable(ctx, field, venue, dto.date, dto.startTime, dto.endTime);
    if (dto.teamSize > field.maxPlayers) throw new ApiError(422, "validation_failed", "Team is too large for this field.", { teamSize: [`Maximum ${field.maxPlayers} players`] });

    const findOpponent = dto.opponentMode === "find" && supportsMatching(field.sport);
    const booking: Booking = {
      id: newId(), code: bookingCode(), userId: user.id, venueId: venue.id, fieldId: field.id, sport: field.sport, date: dto.date,
      startAt: toIso(dto.date, dto.startTime), endAt: toIso(dto.date, dto.endTime), teamSize: dto.teamSize, referee: dto.referee, extras: dto.extras, notes: dto.notes,
      opponentMode: findOpponent ? "find" : "have", matchRequestId: null, price: calculatePrice({ field, ...dto }), paymentMethod: dto.paymentMethod,
      ...initialBookingState(dto.paymentMethod, ctx.now), createdAt: nowIso, cancelledAt: null,
    };
    db.bookings.push(booking);

    // "Find me an opponent" also posts an open match request on the board.
    if (findOpponent && (field.sport === "football" || field.sport === "volleyball")) {
      let teamId = user.teamId;
      if (!teamId) {
        teamId = newId();
        db.teams.push({ id: teamId, name: `${user.name.split(" ").pop() ?? user.name}'s team`, sport: field.sport, captainId: user.id, level: dto.matchLevel ?? "intermediate", memberCount: dto.teamSize, color: "#0B7A4B", bio: "", homeProvince: user.homeProvince, matchesPlayed: 0, wins: 0, sportsmanship: 0, sportsmanshipCount: 0, createdAt: nowIso });
        user.teamId = teamId;
      }
      const match: MatchRequest = {
        id: newId(), hostUserId: user.id, hostTeamId: teamId, sport: field.sport, venueId: venue.id, fieldId: field.id, bookingId: booking.id, date: dto.date, startAt: booking.startAt, endAt: booking.endAt,
        level: dto.matchLevel ?? "intermediate", teamSize: dto.teamSize || defaultTeamSize(field.format, field.sport), costSplit: "split", note: dto.notes, status: "open", createdAt: nowIso,
      };
      db.matchRequests.push(match);
      booking.matchRequestId = match.id;
    }

    // Online payments notify once the payment lands (see confirmPayment).
    if (booking.status === "pending") {
      ctx.notify(user.id, "booking_pending", { venue: venue.name, code: booking.code }, `/booking/${booking.id}`);
      ctx.notify(venue.ownerId, "booking_pending", { venue: venue.name, customer: user.name, code: booking.code }, "/owner/bookings");
    }
    return bookingDetail(db, booking, ctx.now);
  });

  server.route("GET", "/bookings", "auth", ({ db, query, requireUser, now }) => {
    const user = requireUser();
    const q = parse(s.BookingListQuery, query);
    const rows = db.bookings
      .filter((b) => b.userId === user.id)
      .filter((b) => !q.status || b.status === q.status)
      .filter((b) => q.scope === "all" || (q.scope === "upcoming") === isUpcoming(b, now))
      .sort((a, b) => (q.scope === "upcoming" ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt)))
      .map((b) => bookingDetail(db, b, now));
    return paginate(rows, q.page, q.pageSize);
  });

  const ownBooking = (ctx: MockContext): Booking => {
    const user = ctx.requireUser();
    const booking = ctx.db.bookings.find((b) => b.id === ctx.params.id);
    if (!booking) throw notFound("Booking");
    const venue = getVenue(ctx.db, booking.venueId);
    if (booking.userId !== user.id && venue.ownerId !== user.id && user.role !== "admin") throw new ApiError(403, "forbidden", "This booking belongs to someone else.");
    return booking;
  };

  server.route("GET", "/bookings/:id", "auth", (ctx) => bookingDetail(ctx.db, ownBooking(ctx), ctx.now));

  /* ------------------------------ payments ---------------------------- */
  // Start (or resume) paying for a booking that is awaiting payment.
  server.route("POST", "/bookings/:id/payment", "auth", (ctx) => {
    const booking = ownBooking(ctx);
    if (booking.userId !== ctx.requireUser().id) throw new ApiError(403, "forbidden", "Only the player who booked can pay.");
    if (booking.status !== "awaiting_payment" || !holdsSlot(booking, ctx.now)) throw new ApiError(409, "conflict", "This booking is not waiting for a payment.");
    let intent = ctx.db.payments.find((p) => p.bookingId === booking.id && p.status === "pending");
    if (!intent) {
      intent = newPaymentIntent(ctx.newId(), booking, "sandbox", ctx.now);
      ctx.db.payments.push(intent);
    }
    return intentOut(ctx, intent);
  });

  const ownIntent = (ctx: MockContext): MockDb["payments"][number] => {
    const intent = ctx.db.payments.find((p) => p.id === ctx.params.id);
    const booking = intent && ctx.db.bookings.find((b) => b.id === intent.bookingId);
    if (!intent || !booking || booking.userId !== ctx.requireUser().id) throw notFound("Payment");
    return intent;
  };

  server.route("GET", "/payments/:id", "auth", (ctx) => intentOut(ctx, ownIntent(ctx)));

  // Sandbox only: stands in for the bank telling us the money arrived.
  server.route("POST", "/payments/:id/simulate", "auth", (ctx) => {
    const intent = ownIntent(ctx);
    if (Date.parse(intent.expiresAt) <= ctx.now.getTime()) throw new ApiError(409, "conflict", "This payment has expired. Book again.");
    confirmPayment(ctx, intent);
    return intentOut(ctx, intent);
  });

  server.route("POST", "/bookings/:id/cancel", "auth", (ctx) => {
    const booking = ownBooking(ctx);
    if (!canCancel(booking, ctx.now)) throw new ApiError(409, "cancellation_window_passed", "Bookings can be cancelled up to 2 hours before the start.");
    booking.status = "cancelled";
    booking.cancelledAt = ctx.nowIso;
    booking.paymentStatus = refundStatus(booking);
    const match = ctx.db.matchRequests.find((m) => m.id === booking.matchRequestId);
    if (match && match.status !== "cancelled") match.status = "cancelled";
    const venue = getVenue(ctx.db, booking.venueId);
    ctx.notify(venue.ownerId, "booking_cancelled", { venue: venue.name, code: booking.code }, "/owner/bookings");
    return bookingDetail(ctx.db, booking, ctx.now);
  });

  server.route("POST", "/bookings/:id/reschedule", "auth", (ctx) => {
    const booking = ownBooking(ctx);
    const dto = parse(s.RescheduleBookingDto, ctx.body);
    if (!canReschedule(booking, ctx.now)) throw new ApiError(409, "cancellation_window_passed", "Bookings can be changed up to 2 hours before the start.");
    const field = getField(ctx.db, booking.fieldId);
    const venue = getVenue(ctx.db, booking.venueId);
    assertBookable(ctx, field, venue, dto.date, dto.startTime, dto.endTime, booking.id);
    booking.date = dto.date;
    booking.startAt = toIso(dto.date, dto.startTime);
    booking.endAt = toIso(dto.date, dto.endTime);
    booking.price = calculatePrice({ field, date: dto.date, startTime: dto.startTime, endTime: dto.endTime, referee: booking.referee, extras: booking.extras });
    const match = ctx.db.matchRequests.find((m) => m.id === booking.matchRequestId);
    if (match) Object.assign(match, { date: booking.date, startAt: booking.startAt, endAt: booking.endAt });
    ctx.notify(venue.ownerId, "booking_rescheduled", { venue: venue.name, code: booking.code }, "/owner/bookings");
    return bookingDetail(ctx.db, booking, ctx.now);
  });
}
