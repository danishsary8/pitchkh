import { addDays, dateInPP, type Field } from "@pitchkh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTelegram } from "../src/telegram";
import { NOW, startTestApi } from "./harness";

// A fake Telegram: records every Bot API call instead of sending it.
const calls: { method: string; payload: Record<string, unknown> }[] = [];
const telegram = createTelegram({
  token: "test-token",
  username: "PitchKHTestBot",
  webhookSecret: "hook-secret",
  fetch: async (url, init) => {
    calls.push({ method: String(url).split("/").pop() as string, payload: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 });
  },
});

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi(NOW, telegram);
});
afterAll(async () => {
  await api.stop();
});

const webhook = (body: unknown, secret = "hook-secret") =>
  fetch(`${api.base}/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret }, body: JSON.stringify(body) });
const waitFor = async (check: () => boolean) => {
  for (let i = 0; i < 50 && !check(); i++) await new Promise((r) => setTimeout(r, 20));
};

describe("telegram owner alerts", () => {
  it("links an owner, alerts on a cash request, and accepts it from the button", async () => {
    const owner = api.client();
    await owner.auth.login({ email: "sophea@pitchkh.app", password: "password" });
    const status = await owner.owner.telegram();
    expect(status.enabled).toBe(true);
    expect(status.linked).toBe(false);
    const code = status.linkUrl?.split("start=")[1] as string;
    expect(status.linkUrl).toBe(`https://t.me/PitchKHTestBot?start=${code}`);

    // Wrong secret: refused.
    expect((await webhook({ message: { chat: { id: 777 }, text: `/start ${code}` } }, "nope")).status).toBe(403);
    // The owner presses Start in the bot.
    expect((await webhook({ message: { chat: { id: 777 }, text: `/start ${code}` } })).status).toBe(200);
    expect((await owner.owner.telegram()).linked).toBe(true);
    // The same code can't be used again by someone else.
    await webhook({ message: { chat: { id: 999 }, text: `/start ${code}` } });
    expect(calls.at(-1)?.payload.text).toMatch(/expired/);

    // A player sends a cash request at one of the owner's venues.
    const player = api.client();
    await player.auth.login({ email: "dara@pitchkh.app", password: "password" });
    const venue = await player.venues.get("chbar-ampov-football-city");
    const field = venue.fields[0] as Field;
    calls.length = 0;
    const booking = await player.bookings.create({ fieldId: field.id, date: addDays(dateInPP(NOW), 6), startTime: "19:00", endTime: "20:00", teamSize: 6, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have", paymentMethod: "cash" });
    await waitFor(() => calls.some((c) => c.method === "sendMessage"));
    const alert = calls.find((c) => c.method === "sendMessage");
    expect(alert?.payload.chat_id).toBe(777);
    expect(alert?.payload.text).toContain(booking.code);
    expect(alert?.payload.text).toContain("Sok Dara");
    expect(JSON.stringify(alert?.payload.reply_markup)).toContain(`accept:${booking.id}`);

    // The owner taps Accept in Telegram.
    await webhook({ callback_query: { id: "cb1", data: `accept:${booking.id}`, message: { chat: { id: 777 }, message_id: 5, text: String(alert?.payload.text) } } });
    expect((await player.bookings.get(booking.id)).status).toBe("confirmed");
    expect(calls.some((c) => c.method === "answerCallbackQuery" && c.payload.text === "Accepted ✅")).toBe(true);
    // Pressing again is answered politely, nothing changes.
    await webhook({ callback_query: { id: "cb2", data: `reject:${booking.id}`, message: { chat: { id: 777 }, message_id: 5, text: "x" } } });
    expect((await player.bookings.get(booking.id)).status).toBe("confirmed");
  });

  it("ignores button presses from chats that aren't linked", async () => {
    const player = api.client();
    await player.auth.login({ email: "dara@pitchkh.app", password: "password" });
    const pending = (await player.bookings.list({ scope: "upcoming", status: "pending" })).data[0];
    if (!pending) return;
    await webhook({ callback_query: { id: "cb3", data: `accept:${pending.id}`, message: { chat: { id: 12345 }, message_id: 1, text: "x" } } });
    expect((await player.bookings.get(pending.id)).status).toBe("pending");
  });
});
