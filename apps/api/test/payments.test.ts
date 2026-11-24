import { addDays, dateInPP, schemas, type Field } from "@pitchkh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sign } from "../src/payments";
import { NOW, startTestApi } from "./harness";

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.stop();
});

const SECRET = "dev-payment-webhook-secret";
const webhook = (event: unknown, secret = SECRET) => {
  const body = JSON.stringify(event);
  return fetch(`${api.base}/payments/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-pitchkh-signature": sign(secret, body) }, body });
};

async function holdSlot(startTime: string, method: "khqr" | "aba" = "khqr") {
  const client = api.client();
  await client.auth.login({ email: "dara@pitchkh.app", password: "password" });
  const venue = await client.venues.get("koh-pich-football-park");
  const field = venue.fields[1] as Field;
  const date = addDays(dateInPP(NOW), 7);
  const booking = await client.bookings.create({ fieldId: field.id, date, startTime, endTime: `${String(Number(startTime.slice(0, 2)) + 1).padStart(2, "0")}:00`, teamSize: 7, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have", paymentMethod: method });
  return { client, booking, field, date };
}

describe("online payments", () => {
  it("confirms a booking from the provider's signed webhook, once", async () => {
    const { client, booking } = await holdSlot("08:00");
    expect(booking.status).toBe("awaiting_payment");
    const intent = schemas.PaymentIntent.parse(await client.bookings.pay(booking.id));
    expect(intent.qrPayload).toContain(booking.code);
    // Starting again returns the same open payment.
    expect((await client.bookings.pay(booking.id)).id).toBe(intent.id);

    const [{ reference }] = (await api.sql`SELECT reference FROM payments WHERE id = ${intent.id}`) as unknown as [{ reference: string }];
    expect((await webhook({ type: "payment.succeeded", reference }, "wrong-secret")).status).toBe(401);
    expect((await webhook({ type: "payment.succeeded", reference })).status).toBe(200);
    expect((await webhook({ type: "payment.succeeded", reference })).status).toBe(200); // duplicate: no effect
    const after = await client.bookings.get(booking.id);
    expect(after.status).toBe("confirmed");
    expect(after.paymentStatus).toBe("paid");
    expect((await client.bookings.payment(intent.id)).status).toBe("paid");
    // One confirmation notice, not two.
    const notes = (await client.notifications.list()).filter((n) => n.type === "booking_confirmed" && n.params.code === booking.code);
    expect(notes).toHaveLength(1);
  });

  it("holds the slot while unpaid, then releases it and refunds a late payment", async () => {
    const { client, booking, field, date } = await holdSlot("10:00", "aba");
    const intent = await client.bookings.pay(booking.id);
    expect(intent.deeplink).toContain("/aba/");
    const day = await client.venues.availability(field.id, date);
    expect(day.slots.find((s) => s.start === "10:00")?.status).toBe("booked");

    api.setNow(new Date(NOW.getTime() + 11 * 60_000));
    try {
      expect((await client.venues.availability(field.id, date)).slots.find((s) => s.start === "10:00")?.status).toBe("available");
      await expect(client.bookings.simulatePayment(intent.id)).rejects.toMatchObject({ code: "conflict" });
      // Someone else can take the slot now.
      const other = await holdSlot("10:00");
      expect(other.booking.status).toBe("awaiting_payment");
      expect((await client.bookings.get(booking.id)).status).toBe("cancelled");
      // The bank still reports the late payment: it is marked for refund, the new hold is untouched.
      const [{ reference }] = (await api.sql`SELECT reference FROM payments WHERE id = ${intent.id}`) as unknown as [{ reference: string }];
      await webhook({ type: "payment.succeeded", reference });
      expect((await client.bookings.get(booking.id)).paymentStatus).toBe("refunded");
      expect((await other.client.bookings.get(other.booking.id)).status).toBe("awaiting_payment");
    } finally {
      api.setNow(NOW);
    }
  });

  it("only lets the booker pay", async () => {
    const { booking } = await holdSlot("12:00");
    const owner = api.client();
    await owner.auth.login({ email: "piseth@pitchkh.app", password: "password" });
    await expect(owner.bookings.pay(booking.id)).rejects.toMatchObject({ status: 404 });
  });
});
