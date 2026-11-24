import { addDays, dateInPP, type Field } from "@pitchkh/shared";
import { BakongKHQR } from "bakong-khqr";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bakongProvider } from "../src/bakong";
import { startTestApi } from "./harness";

// The KHQR library checks expiry against the real clock, so this file runs at real time.
const NOW = new Date();

// A fake Bakong Open API: answers check_transaction_by_md5 from this table.
const paid = new Map<string, { amount: number; toAccountId: string; currency: string }>();
const calls: { auth: string | null; md5: string }[] = [];
const provider = bakongProvider({
  token: "test-token",
  accountId: "pitchkh@aclb",
  merchantName: "PitchKH",
  merchantCity: "Phnom Penh",
  apiUrl: "https://bakong.test",
  fetch: async (_url, init) => {
    const { md5 } = JSON.parse(String(init?.body)) as { md5: string };
    calls.push({ auth: new Headers(init?.headers).get("authorization"), md5 });
    const hit = paid.get(md5);
    return new Response(JSON.stringify(hit ? { responseCode: 0, data: hit } : { responseCode: 1, errorCode: 1, data: null }), { status: 200 });
  },
});

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi(NOW, undefined, { payments: provider });
});
afterAll(async () => {
  await api.stop();
});

async function book(startTime: string) {
  const c = api.client();
  await c.auth.login({ email: "dara@pitchkh.app", password: "password" });
  const venue = await c.venues.get("toul-kork-arena");
  const field = venue.fields[1] as Field;
  const booking = await c.bookings.create({ fieldId: field.id, date: addDays(dateInPP(NOW), 9), startTime, endTime: `${String(Number(startTime.slice(0, 2)) + 1).padStart(2, "0")}:00`, teamSize: 7, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have", paymentMethod: "aba" });
  return { c, booking };
}
const md5Of = async (paymentId: string) => ((await api.sql`SELECT reference FROM payments WHERE id = ${paymentId}`) as unknown as [{ reference: string }])[0].reference;
const pause = () => new Promise((r) => setTimeout(r, 3100)); // checks are throttled to one per 3 s

describe("Bakong KHQR", () => {
  it("shows a real KHQR for the exact amount and confirms once Bakong reports the payment", async () => {
    const { c, booking } = await book("08:00");
    const intent = await c.bookings.pay(booking.id);
    expect(intent.provider).toBe("bakong");
    expect(BakongKHQR.verify(intent.qrPayload as string).isValid).toBe(true);
    expect(intent.qrPayload).toContain("pitchkh@aclb");
    expect(intent.qrPayload).toContain(booking.code);
    expect(intent.qrPayload).toContain(`54${String(booking.price.totalUsd.toFixed(2).length).padStart(2, "0")}${booking.price.totalUsd.toFixed(2)}`);
    await expect(c.bookings.simulatePayment(intent.id)).rejects.toMatchObject({ status: 404 });

    // Not paid yet: polling leaves it pending.
    expect((await c.bookings.payment(intent.id)).status).toBe("pending");
    expect(calls.at(-1)?.auth).toBe("Bearer test-token");

    // The player pays in their bank app; the next poll sees it.
    paid.set(await md5Of(intent.id), { amount: booking.price.totalUsd, toAccountId: "pitchkh@aclb", currency: "USD" });
    await pause();
    const after = await c.bookings.payment(intent.id);
    expect(after.status).toBe("paid");
    expect(after.bookingStatus).toBe("confirmed");
  }, 20_000);

  it("does not confirm a payment for the wrong amount", async () => {
    const { c, booking } = await book("10:00");
    const intent = await c.bookings.pay(booking.id);
    paid.set(await md5Of(intent.id), { amount: 0.01, toAccountId: "pitchkh@aclb", currency: "USD" });
    expect((await c.bookings.payment(intent.id)).status).toBe("pending");
    expect((await c.bookings.get(booking.id)).status).toBe("awaiting_payment");
  });
});
