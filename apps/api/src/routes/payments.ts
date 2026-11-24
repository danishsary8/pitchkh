import { ApiError, holdsSlot, type PaymentIntent } from "@pitchkh/shared";
import { notFound } from "@pitchkh/shared/mock";
import { and, eq } from "drizzle-orm";
import type { Tx } from "../db/client";
import { iso, toBooking } from "../db/mappers";
import * as t from "../db/schema";
import type { Ctx, Route } from "../http";
import type { PaymentProvider } from "../payments";
import { findVenue } from "../views";

type PaymentRow = typeof t.payments.$inferSelect;
const isId = (v: string | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

function intentOut(row: PaymentRow, bookingStatus: PaymentIntent["bookingStatus"], now: Date): PaymentIntent {
  return {
    id: row.id, bookingId: row.bookingId, provider: row.provider, method: row.method, amountUsd: row.amountUsd, amountKhr: row.amountKhr,
    status: row.status === "pending" && row.expiresAt <= now ? "expired" : row.status,
    qrPayload: row.qrPayload, deeplink: row.deeplink, expiresAt: iso(row.expiresAt), paidAt: row.paidAt ? iso(row.paidAt) : null, bookingStatus,
  };
}

/**
 * The provider says "paid". Runs once per payment (row lock + status check),
 * so a webhook that arrives twice changes nothing the second time.
 */
export async function confirmPayment(ctx: Pick<Ctx, "notify" | "now">, tx: Tx, reference: string): Promise<PaymentRow | null> {
  const [payment] = await tx.select().from(t.payments).where(eq(t.payments.reference, reference)).for("update");
  if (!payment || payment.status === "paid") return payment ?? null;
  const [paid] = await tx.update(t.payments).set({ status: "paid", paidAt: ctx.now }).where(eq(t.payments.id, payment.id)).returning();
  const [row] = await tx.select().from(t.bookings).where(eq(t.bookings.id, payment.bookingId)).for("update");
  if (!row) return paid ?? null;
  const booking = toBooking(row);
  if (booking.status !== "awaiting_payment" || !holdsSlot(booking, ctx.now)) {
    // Paid too late (hold expired or cancelled): the money is returned.
    await tx.update(t.bookings).set({ paymentStatus: "refunded" }).where(eq(t.bookings.id, booking.id));
    return paid ?? null;
  }
  await tx.update(t.bookings).set({ status: "confirmed", paymentStatus: "paid", paymentDueAt: null }).where(eq(t.bookings.id, booking.id));
  const venue = await findVenue(tx, booking.venueId);
  const [customer] = await tx.select({ name: t.users.name }).from(t.users).where(eq(t.users.id, booking.userId));
  await ctx.notify(tx, booking.userId, "booking_confirmed", { venue: venue.name, code: booking.code }, `/booking/${booking.id}`);
  await ctx.notify(tx, venue.ownerId, "booking_confirmed", { venue: venue.name, customer: customer?.name ?? "", code: booking.code }, "/owner/bookings", { bookingId: booking.id });
  return paid ?? null;
}

export function registerPaymentRoutes(route: Route, provider: PaymentProvider): void {
  /** The player's own payment, with its booking's current status. */
  const ownPayment = async (ctx: Ctx, tx: Tx = ctx.db) => {
    if (!isId(ctx.params.id)) throw notFound("Payment");
    const [payment] = await tx.select().from(t.payments).where(eq(t.payments.id, ctx.params.id));
    const [booking] = payment ? await tx.select().from(t.bookings).where(eq(t.bookings.id, payment.bookingId)) : [];
    if (!payment || !booking || booking.userId !== ctx.requireUser().id) throw notFound("Payment");
    return { payment, booking };
  };

  // Start (or resume) paying for a booking that is awaiting payment.
  route("POST", "/bookings/:id/payment", "auth", async (ctx) => {
    const user = ctx.requireUser();
    if (!isId(ctx.params.id)) throw notFound("Booking");
    return ctx.db.transaction(async (tx) => {
      const [row] = await tx.select().from(t.bookings).where(eq(t.bookings.id, ctx.params.id as string)).for("update");
      if (!row || row.userId !== user.id) throw notFound("Booking");
      const booking = toBooking(row);
      if (booking.status !== "awaiting_payment" || !holdsSlot(booking, ctx.now)) throw new ApiError(409, "conflict", "This booking is not waiting for a payment.");
      const [open] = await tx.select().from(t.payments).where(and(eq(t.payments.bookingId, booking.id), eq(t.payments.status, "pending")));
      if (open && open.expiresAt > ctx.now) return intentOut(open, booking.status, ctx.now);
      const made = await provider.createIntent(booking);
      const [created] = await tx.insert(t.payments).values({
        id: ctx.newId(), bookingId: booking.id, provider: provider.name, method: booking.paymentMethod, reference: made.reference,
        amountUsd: booking.price.totalUsd, amountKhr: booking.price.totalKhr, status: "pending", qrPayload: made.qrPayload, deeplink: made.deeplink,
        expiresAt: new Date(booking.paymentDueAt as string), paidAt: null,
      }).returning();
      return intentOut(created as PaymentRow, booking.status, ctx.now);
    });
  });

  route("GET", "/payments/:id", "auth", async (ctx) => {
    const { payment, booking } = await ownPayment(ctx);
    return intentOut(payment, booking.status, ctx.now);
  });

  // Sandbox only: stands in for the bank calling our webhook.
  route("POST", "/payments/:id/simulate", "auth", async (ctx) => {
    if (!provider.canSimulate) throw new ApiError(404, "not_found", "No route for this provider.");
    const { payment } = await ownPayment(ctx);
    if (payment.status === "pending" && payment.expiresAt <= ctx.now) throw new ApiError(409, "conflict", "This payment has expired. Book again.");
    await ctx.db.transaction((tx) => confirmPayment(ctx, tx, payment.reference));
    const fresh = await ownPayment(ctx);
    return intentOut(fresh.payment, fresh.booking.status, ctx.now);
  });

  // The provider's server calls this when money arrives. Always 200 for a valid signature.
  route("POST", "/payments/webhook", "public", async (ctx) => {
    const event = provider.verifyWebhook(ctx.rawBody, ctx.header);
    if (!event) throw new ApiError(401, "unauthorized", "Bad signature.");
    await ctx.db.transaction((tx) => confirmPayment(ctx, tx, event.reference));
    return { ok: true };
  });
}
