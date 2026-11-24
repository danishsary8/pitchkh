/**
 * Telegram booking alerts for venue owners.
 *
 * 1. The owner opens t.me/<bot>?start=<code> from the dashboard and presses Start.
 * 2. Telegram sends that "/start <code>" to our webhook; we store their chat id.
 * 3. New bookings, cancellations and changes become a bot message. Cash requests
 *    get Accept / Decline buttons that answer the request right from Telegram.
 */
import { randomBytes } from "node:crypto";
import { isoInPP, type BookingDetail, type NotificationType, type User } from "@pitchkh/shared";
import { eq } from "drizzle-orm";
import type { Database } from "./db/client";
import { toBooking, toUser } from "./db/mappers";
import * as t from "./db/schema";
import { bookingDetailOf } from "./views";

export interface TelegramConfig {
  token: string;
  username: string;
  webhookSecret: string;
  /** Injectable for tests. */
  fetch?: typeof fetch;
}

export interface TelegramClient {
  config: TelegramConfig;
  call(method: string, payload: Record<string, unknown>): Promise<unknown>;
}

export function createTelegram(config: TelegramConfig): TelegramClient | undefined {
  if (!config.token || !config.username) return undefined;
  const doFetch = config.fetch ?? fetch;
  return {
    config,
    async call(method, payload) {
      const res = await doFetch(`https://api.telegram.org/bot${config.token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Telegram ${method} failed: ${res.status}`);
      return res.json();
    },
  };
}

export const newLinkCode = (): string => randomBytes(12).toString("base64url");

/* ------------------------------ messages ------------------------------ */

type Locale = "en" | "km";
const TEXT = {
  en: {
    booking_pending: "🟡 New cash request",
    booking_confirmed: "✅ New booking (paid)",
    booking_cancelled: "❌ Booking cancelled",
    booking_rescheduled: "🔁 Booking moved",
    accept: "Accept",
    decline: "Decline",
    accepted: "Accepted ✅",
    declined: "Declined ❌",
    linked: "Connected! You'll get PitchKH booking alerts in this chat.",
    unknownCode: "This link has expired. Open Telegram alerts in your PitchKH dashboard to get a new one.",
    players: "players",
  },
  km: {
    booking_pending: "🟡 សំណើកក់ថ្មី (សាច់ប្រាក់)",
    booking_confirmed: "✅ ការកក់ថ្មី (បានបង់)",
    booking_cancelled: "❌ ការកក់ត្រូវបានលុបចោល",
    booking_rescheduled: "🔁 ការកក់ត្រូវបានផ្លាស់ម៉ោង",
    accept: "ទទួលយក",
    decline: "បដិសេធ",
    accepted: "បានទទួលយក ✅",
    declined: "បានបដិសេធ ❌",
    linked: "បានភ្ជាប់! អ្នកនឹងទទួលបានការជូនដំណឹងការកក់ PitchKH នៅទីនេះ។",
    unknownCode: "តំណនេះផុតកំណត់ហើយ។ សូមបើកការជូនដំណឹង Telegram ក្នុងផ្ទាំងគ្រប់គ្រង PitchKH ដើម្បីយកតំណថ្មី។",
    players: "នាក់",
  },
} as const;
const text = (locale: string | undefined) => TEXT[(locale === "km" ? "km" : "en") as Locale];

const ALERT_TYPES = new Set<NotificationType>(["booking_pending", "booking_confirmed", "booking_cancelled", "booking_rescheduled"]);

export function bookingMessage(booking: BookingDetail, type: NotificationType, locale: string | undefined): string {
  const tx = text(locale);
  const title = tx[type as keyof typeof tx] ?? type;
  const time = `${isoInPP(new Date(booking.startAt)).slice(11, 16)}–${isoInPP(new Date(booking.endAt)).slice(11, 16)}`;
  return [
    `${title}`,
    `${booking.venue.name} · ${booking.field.name} (${booking.field.format})`,
    `📅 ${booking.date}  🕒 ${time}`,
    `👤 ${booking.customer.name} · ${booking.customer.phone} · ${booking.teamSize} ${tx.players}`,
    `💵 $${booking.price.totalUsd.toFixed(2)} · ${booking.paymentMethod.toUpperCase()}`,
    `#${booking.code}`,
  ].join("\n");
}

/** After a notification is written: if it's a booking alert for a linked owner, message them. */
export async function alertOwner(db: Database, telegram: TelegramClient, n: { userId: string; type: NotificationType; meta?: Record<string, string> }, now: Date): Promise<void> {
  if (!ALERT_TYPES.has(n.type) || !n.meta?.bookingId) return;
  const [link] = await db.select().from(t.telegramLinks).where(eq(t.telegramLinks.userId, n.userId));
  if (!link?.chatId) return;
  const [ownerRow] = await db.select().from(t.users).where(eq(t.users.id, n.userId));
  const [row] = await db.select().from(t.bookings).where(eq(t.bookings.id, n.meta.bookingId));
  if (!row || !ownerRow) return;
  const owner = toUser(ownerRow);
  const booking = await bookingDetailOf(db, toBooking(row), now);
  const tx = text(owner.locale);
  await telegram.call("sendMessage", {
    chat_id: link.chatId,
    text: bookingMessage(booking, n.type, owner.locale),
    ...(n.type === "booking_pending" && booking.status === "pending"
      ? { reply_markup: { inline_keyboard: [[{ text: tx.accept, callback_data: `accept:${booking.id}` }, { text: tx.decline, callback_data: `reject:${booking.id}` }]] } }
      : {}),
  });
}

/** The owner whose Telegram chat this is, if linked. */
export async function ownerByChat(db: Database, chatId: number): Promise<User | null> {
  const [link] = await db.select().from(t.telegramLinks).where(eq(t.telegramLinks.chatId, chatId));
  if (!link) return null;
  const [row] = await db.select().from(t.users).where(eq(t.users.id, link.userId));
  return row ? toUser(row) : null;
}

export const telegramText = text;
