import { telegramChatUrl, toKhInternational } from "@pitchkh/shared";
import type { Booking } from "./booking-rules";

export type ChatVia = "username" | "account" | "phone";

export interface ChatLink {
  url: string;
  /** How the link reaches the customer, best first: @username, Telegram account, phone number. */
  via: ChatVia;
}

type Contact = Pick<Booking, "telegramUsername" | "telegramUserId" | "phone">;

/**
 * Every way staff can open a Telegram chat with this customer, best first.
 * - @username: always works.
 * - Telegram account (tg://user?id=): for bookings made in the bot by people
 *   without a username; works unless their privacy settings forbid it.
 * - phone (t.me/+855...): for website bookings; works if that number has
 *   Telegram and lets others find it by number.
 */
export function chatLinks(c: Contact): ChatLink[] {
  const links: ChatLink[] = [];
  if (c.telegramUsername && /^[A-Za-z0-9_]{4,32}$/.test(c.telegramUsername)) links.push({ url: `https://t.me/${c.telegramUsername}`, via: "username" });
  if (c.telegramUserId && /^\d{1,20}$/.test(c.telegramUserId)) links.push({ url: `tg://user?id=${c.telegramUserId}`, via: "account" });
  const byPhone = c.phone ? telegramChatUrl(c.phone) : null;
  if (byPhone) links.push({ url: byPhone, via: "phone" });
  return links;
}

/** The single best chat link, or null if there is no way to reach them on Telegram. */
export const bestChatLink = (c: Contact): ChatLink | null => chatLinks(c)[0] ?? null;

/** tel: link in international form, or null without a usable number. */
export function callLink(phone: string): string | null {
  const number = phone ? toKhInternational(phone) : null;
  return number ? `tel:+${number}` : null;
}
