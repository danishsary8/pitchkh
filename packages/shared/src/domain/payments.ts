import { APP } from "../config";
import type { Booking, PaymentIntent } from "../types";
import { isoInPP } from "./time";

/**
 * The sandbox provider's QR content. A real KHQR payload (EMVCo, from the
 * Bakong SDK) replaces this; the client just renders whatever string it gets.
 */
export function sandboxQrPayload(booking: Pick<Booking, "code" | "price">): string {
  return `KHQR-SANDBOX|PitchKH|${booking.code}|${booking.price.totalKhr}KHR`;
}

/** A fresh payment attempt for a booking that is awaiting payment. */
export function newPaymentIntent(id: string, booking: Booking, provider: string, now: Date): Omit<PaymentIntent, "bookingStatus"> {
  const due = booking.paymentDueAt ? Date.parse(booking.paymentDueAt) : now.getTime() + APP.paymentHoldMinutes * 60_000;
  return {
    id, bookingId: booking.id, provider, method: booking.paymentMethod, amountUsd: booking.price.totalUsd, amountKhr: booking.price.totalKhr,
    status: "pending",
    qrPayload: booking.paymentMethod === "khqr" ? sandboxQrPayload(booking) : null,
    deeplink: booking.paymentMethod === "khqr" ? null : `https://pay.example/${provider}/${booking.paymentMethod}/${booking.code}`,
    expiresAt: isoInPP(new Date(due)),
    paidAt: null,
  };
}
