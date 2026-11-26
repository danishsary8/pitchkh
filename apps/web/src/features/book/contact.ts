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

/**
 * Turns the form into the exact body POST /api/bookings expects, validated by
 * the same zod schema the server uses. Returns which fields need fixing.
 */
export function toBookingRequest(slot: Slot, input: ContactInput): { ok: true; request: BookingRequest } | { ok: false; errors: ContactErrors } {
  const players = input.players.trim() === "" ? Number.NaN : Number(input.players);
  const parsed = BookingRequest.safeParse({ ...slot, name: input.name, phone: input.phone, players, note: input.note });
  if (parsed.success) return { ok: true, request: parsed.data };
  const errors: ContactErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key === "name" || key === "phone" || key === "players") errors[key] = true;
  }
  // A problem outside the contact fields (the slot itself) is the server's to explain.
  if (Object.keys(errors).length === 0) return { ok: true, request: { ...slot, name: input.name.trim(), phone: input.phone, players, note: input.note.trim() } };
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
