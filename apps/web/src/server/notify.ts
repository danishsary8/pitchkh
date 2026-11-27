import "server-only";
import { formatUsd } from "@pitchkh/shared";
import { findBranch } from "@/lib/branches";
import { hhmm, type Booking } from "@/lib/booking-rules";
import { chatLinks } from "@/lib/customer-contact";
import { siteUrl } from "@/lib/site";
import { adminIds, escapeHtml, type InlineButton, sendMessage } from "./telegram";

const describe = (b: Booking): { branch: string; field: string; when: string } => {
  const branch = findBranch(b.branch);
  const field = branch?.fields.find((f) => f.id === b.fieldId);
  return { branch: branch?.name ?? b.branch, field: field ? `${field.name} (${field.format})` : b.fieldId, when: `${b.date} · ${hhmm(b.startMin)}–${hhmm(b.endMin)}` };
};

/**
 * Buttons under a new-request message: chat with the customer, then open the
 * admin screen. One message per chat option, best first, so a customer whose
 * privacy settings block one link still leaves a working message.
 */
export function newBookingKeyboards(b: Booking): InlineButton[][][] {
  const open: InlineButton[] = [{ text: "📋 Open bookings", web_app: { url: `${siteUrl}/en/admin?date=${b.date}&branch=${b.branch}` } }];
  const chats = chatLinks(b).map((link) => [[{ text: link.via === "phone" ? "💬 Chat (by phone number)" : "💬 Chat with customer", url: link.url }], open]);
  return [...chats, [open]];
}

/** Tells every staff member about a new request, with buttons to chat and to open the admin screen. */
export async function notifyNewBooking(b: Booking): Promise<void> {
  const d = describe(b);
  const contact = b.telegramUsername ? `@${escapeHtml(b.telegramUsername)}` : b.telegramUserId ? "Telegram, no username" : "no Telegram";
  const text = [
    `🆕 <b>New booking request</b> ${b.code}`,
    `${escapeHtml(d.branch)} · ${escapeHtml(d.field)}`,
    `🗓 ${d.when}`,
    `👤 ${escapeHtml(b.name)} · ${escapeHtml(b.phone)} · ${contact}`,
    `👥 ${b.players} players · ${formatUsd(b.priceUsd)}`,
    b.note ? `📝 ${escapeHtml(b.note)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const keyboards = newBookingKeyboards(b);
  await Promise.all(
    [...adminIds()].map(async (id) => {
      for (const keyboard of keyboards) if (await sendMessage(id, text, keyboard)) return;
    }),
  );
}

/** Tells the customer (if they booked from Telegram) that staff confirmed or declined. */
export async function notifyCustomer(b: Booking): Promise<void> {
  if (!b.telegramUserId || b.source !== "customer") return;
  const d = describe(b);
  const head = b.status === "confirmed" ? `✅ <b>Booking confirmed</b> ${b.code}` : b.status === "cancelled" ? `❌ <b>Booking cancelled</b> ${b.code}` : null;
  if (!head) return;
  await sendMessage(b.telegramUserId, [head, `${escapeHtml(d.branch)} · ${escapeHtml(d.field)}`, `🗓 ${d.when}`, `💵 ${formatUsd(b.priceUsd)}, pay at the venue`].join("\n"));
}
