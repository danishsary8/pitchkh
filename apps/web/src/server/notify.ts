import "server-only";
import { formatUsd } from "@pitchkh/shared";
import { findBranch } from "@/lib/branches";
import { hhmm, type Booking } from "@/lib/booking-rules";
import { siteUrl } from "@/lib/site";
import { adminIds, escapeHtml, sendMessage } from "./telegram";

const describe = (b: Booking): { branch: string; field: string; when: string } => {
  const branch = findBranch(b.branch);
  const field = branch?.fields.find((f) => f.id === b.fieldId);
  return { branch: branch?.name ?? b.branch, field: field ? `${field.name} (${field.format})` : b.fieldId, when: `${b.date} · ${hhmm(b.startMin)}–${hhmm(b.endMin)}` };
};

/** Tells every staff member about a new request, with a button that opens the admin screen. */
export async function notifyNewBooking(b: Booking): Promise<void> {
  const d = describe(b);
  const contact = b.telegramUsername ? `@${escapeHtml(b.telegramUsername)}` : "no Telegram";
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
  const buttons = [[{ text: "Open bookings", web_app: { url: `${siteUrl}/en/admin?date=${b.date}&branch=${b.branch}` } }]];
  await Promise.all([...adminIds()].map((id) => sendMessage(id, text, buttons)));
}

/** Tells the customer (if they booked from Telegram) that staff confirmed or declined. */
export async function notifyCustomer(b: Booking): Promise<void> {
  if (!b.telegramUserId || b.source !== "customer") return;
  const d = describe(b);
  const head = b.status === "confirmed" ? `✅ <b>Booking confirmed</b> ${b.code}` : b.status === "cancelled" ? `❌ <b>Booking cancelled</b> ${b.code}` : null;
  if (!head) return;
  await sendMessage(b.telegramUserId, [head, `${escapeHtml(d.branch)} · ${escapeHtml(d.field)}`, `🗓 ${d.when}`, `💵 ${formatUsd(b.priceUsd)}, pay at the venue`].join("\n"));
}
