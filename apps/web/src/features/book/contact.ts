import { BookingRequest } from "@/lib/booking-rules";

/** The fields a customer types in the booking form, as typed. */
export interface ContactInput {
  name: string;
  phone: string;
  players: string;
  note: string;
}

export type ContactErrors = Partial<Record<"name" | "phone" | "players", true>>;

type Slot = Pick<BookingRequest, "branch" | "fieldId" | "date" | "startMin" | "duration">;

/** Only the fields the customer types, taken from the server's own schema. */
const ContactSchema = BookingRequest.pick({ name: true, phone: true, players: true, note: true });

/**
 * Turns the form into the exact body POST /api/bookings expects. The contact
 * fields are checked with the server's own rules (same zod schema), so what
 * passes here passes there; the slot itself is the server's to judge.
 */
export function toBookingRequest(slot: Slot, input: ContactInput): { ok: true; request: BookingRequest } | { ok: false; errors: ContactErrors } {
  const players = input.players.trim() === "" ? Number.NaN : Number(input.players);
  const parsed = ContactSchema.safeParse({ name: input.name, phone: input.phone, players, note: input.note });
  if (parsed.success) return { ok: true, request: { ...slot, ...parsed.data } };
  const errors: ContactErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key === "name" || key === "phone" || key === "players") errors[key] = true;
  }
  return { ok: false, errors };
}

const STORAGE_KEY = "pitchkh-contact";

/** Last booking's name and phone, else the Telegram name. Storage can be blocked; that is fine. */
export function rememberedContact(telegramUser?: { first_name?: string; last_name?: string }): { name: string; phone: string } {
  const telegramName = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ");
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { name?: unknown; phone?: unknown } | null;
    return {
      name: typeof saved?.name === "string" && saved.name ? saved.name : telegramName,
      phone: typeof saved?.phone === "string" ? saved.phone : "",
    };
  } catch {
    return { name: telegramName, phone: "" };
  }
}

export function rememberContact({ name, phone }: { name: string; phone: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, phone }));
  } catch {
    // Not remembered next time; nothing else depends on it.
  }
}
