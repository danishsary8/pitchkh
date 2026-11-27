import { afterEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/booking-rules";
import { newBookingKeyboards, notifyNewBooking } from "./notify";

const booking: Booking = {
  id: "00000000-0000-4000-8000-000000000001",
  code: "PK-TEST2",
  branch: "sen-sok",
  fieldId: "sen-sok-f2",
  date: "2026-11-28",
  startMin: 1080,
  endMin: 1140,
  status: "pending",
  name: "Sok <Dara>",
  phone: "012345678",
  players: 10,
  note: "",
  priceUsd: 26,
  source: "customer",
  telegramUserId: "42",
  telegramUsername: null,
  createdAt: "2026-11-27T00:00:00.000Z",
};

type Sent = { chat_id: string; text: string; reply_markup?: { inline_keyboard: { text: string; url?: string }[][] } };

afterEach(() => vi.unstubAllGlobals());

describe("newBookingKeyboards", () => {
  it("offers each chat option with Open bookings, then Open bookings alone", () => {
    const keyboards = newBookingKeyboards(booking);
    expect(keyboards.map((k) => k[0]?.[0]?.text)).toEqual(["💬 Chat with customer", "💬 Chat (by phone number)", "📋 Open bookings"]);
    expect(keyboards[0]?.[0]?.[0]?.url).toBe("tg://user?id=42");
    expect(keyboards[0]?.[1]?.[0]?.web_app?.url).toContain("/en/admin?date=2026-11-28&branch=sen-sok");
  });
});

describe("notifyNewBooking", () => {
  it("falls back to the next button when Telegram refuses one, and escapes names", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:TEST";
    process.env.ADMIN_TELEGRAM_IDS = "111";
    const sent: Sent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as Sent;
        sent.push(body);
        // Telegram rejects the account link when the customer's privacy settings forbid it.
        const blocked = body.reply_markup?.inline_keyboard[0]?.[0]?.url?.startsWith("tg://");
        return new Response(blocked ? '{"ok":false,"description":"Bad Request: BUTTON_USER_PRIVACY_RESTRICTED"}' : '{"ok":true}', { status: blocked ? 400 : 200 });
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await notifyNewBooking(booking);
    expect(sent).toHaveLength(2);
    expect(sent[1]?.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe("https://t.me/+85512345678");
    expect(sent[1]?.text).toContain("Sok &lt;Dara&gt;");
  });
});
