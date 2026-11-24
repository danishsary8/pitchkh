/**
 * Online payments. A provider turns a booking into something to pay (a KHQR
 * string or an app link) and later confirms it through a signed webhook.
 * Only the sandbox provider exists today; a Bakong KHQR or ABA PayWay
 * provider implements the same two methods with its own API and signature.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sandboxQrPayload, type Booking } from "@pitchkh/shared";

export interface PaymentProvider {
  name: string;
  /** Called when the player starts paying. `reference` comes back in the webhook. */
  createIntent(booking: Booking): Promise<{ reference: string; qrPayload: string | null; deeplink: string | null }>;
  /** Checks the webhook really comes from the provider; returns the paid reference, or null to ignore. */
  verifyWebhook(rawBody: string, headers: (name: string) => string | undefined): { reference: string } | null;
  /** The sandbox can confirm a payment on request (the "I've paid" button). Real providers can't. */
  canSimulate: boolean;
}

export const sign = (secret: string, body: string): string => createHmac("sha256", secret).update(body).digest("hex");

/** Fake bank: KHQR payload or app link, confirmed by a webhook signed with PAYMENT_WEBHOOK_SECRET. */
export function sandboxProvider(webhookSecret: string): PaymentProvider {
  return {
    name: "sandbox",
    canSimulate: true,
    async createIntent(booking) {
      const reference = `sbx_${randomBytes(9).toString("base64url")}`;
      return booking.paymentMethod === "khqr"
        ? { reference, qrPayload: sandboxQrPayload(booking), deeplink: null }
        : { reference, qrPayload: null, deeplink: `https://sandbox.pitchkh.app/pay/${booking.paymentMethod}/${reference}` };
    },
    verifyWebhook(rawBody, headers) {
      const given = Buffer.from(headers("x-pitchkh-signature") ?? "", "utf8");
      const expected = Buffer.from(sign(webhookSecret, rawBody), "utf8");
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
      const event = JSON.parse(rawBody) as { type?: string; reference?: string };
      return event.type === "payment.succeeded" && event.reference ? { reference: event.reference } : null;
    },
  };
}
