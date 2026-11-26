import { after } from "next/server";
import { BookingRequest, checkRules, priceFor } from "@/lib/booking-rules";
import { findBranch, findField } from "@/lib/branches";
import { fail, json, log, rateLimited, readJson } from "@/server/http";
import { notifyNewBooking } from "@/server/notify";
import { getStore, SlotTakenError } from "@/server/store";
import { customerFromRequest } from "@/server/telegram";

export const dynamic = "force-dynamic";

/** POST /api/bookings: a customer asks for a pitch. No account needed; it starts as "pending". */
export async function POST(request: Request) {
  if (rateLimited(request, "book", 10, 10 * 60_000)) return fail(429, "too_many");
  const parsed = BookingRequest.safeParse(await readJson(request));
  if (!parsed.success) return fail(400, "invalid", { fields: parsed.error.issues.map((i) => i.path.join(".")) });
  const req = parsed.data;
  const branch = findBranch(req.branch);
  if (!branch) return fail(400, "unknown_branch");
  const ruleError = checkRules(branch, req);
  if (ruleError) return fail(400, ruleError);
  const field = findField(branch, req.fieldId);
  if (!field) return fail(400, "unknown_field");

  const tg = customerFromRequest(request);
  const endMin = req.startMin + req.duration;
  try {
    const booking = await getStore().create({
      branch: branch.slug,
      fieldId: field.id,
      date: req.date,
      startMin: req.startMin,
      endMin,
      status: "pending",
      name: req.name,
      phone: req.phone,
      players: req.players,
      note: req.note,
      priceUsd: priceFor(field, req.startMin, endMin),
      source: "customer",
      telegramUserId: tg?.id ?? null,
      telegramUsername: tg?.username ?? null,
    });
    log("info", "booking_created", { id: booking.id, code: booking.code, branch: booking.branch, field: booking.fieldId, date: booking.date, telegram: !!tg });
    after(() => notifyNewBooking(booking));
    return json({ booking: { code: booking.code, status: booking.status, branch: booking.branch, fieldId: booking.fieldId, date: booking.date, startMin: booking.startMin, endMin: booking.endMin, priceUsd: booking.priceUsd } }, 201);
  } catch (error) {
    if (error instanceof SlotTakenError) return fail(409, "slot_taken");
    log("error", "booking_failed", { error: String(error) });
    return fail(503, "unavailable");
  }
}
