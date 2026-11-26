import { dateInPP } from "@pitchkh/shared";
import { AdminBookingRequest, checkRules, priceFor, STAFF_GRACE_MIN } from "@/lib/booking-rules";
import { BRANCHES, findBranch, findField } from "@/lib/branches";
import { fail, json, log, readJson } from "@/server/http";
import { getStore, SlotTakenError } from "@/server/store";
import { checkAdmin } from "@/server/telegram";

export const dynamic = "force-dynamic";

/** GET /api/admin/bookings?branch=&date= → that day's bookings, plus every upcoming request still waiting. */
export async function GET(request: Request) {
  const check = checkAdmin(request);
  if (!check.ok) return fail(check.reason === "not_admin" ? 403 : 401, check.reason);
  const url = new URL(request.url);
  const branch = findBranch(url.searchParams.get("branch") ?? "") ?? BRANCHES[0];
  const date = url.searchParams.get("date") ?? "";
  if (!branch || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, "invalid");
  try {
    const store = getStore();
    const [day, pending] = await Promise.all([store.listDay(branch.slug, date), store.listPending(dateInPP(new Date()))]);
    return json({ branch: branch.slug, date, day, pending });
  } catch (error) {
    log("error", "admin_list_failed", { error: String(error) });
    return fail(503, "unavailable");
  }
}

/** POST /api/admin/bookings: staff enter a walk-in or phone booking. It is confirmed straight away. */
export async function POST(request: Request) {
  const check = checkAdmin(request);
  if (!check.ok) return fail(check.reason === "not_admin" ? 403 : 401, check.reason);
  const parsed = AdminBookingRequest.safeParse(await readJson(request));
  if (!parsed.success) return fail(400, "invalid", { fields: parsed.error.issues.map((i) => i.path.join(".")) });
  const req = parsed.data;
  const branch = findBranch(req.branch);
  const field = branch ? findField(branch, req.fieldId) : undefined;
  if (!branch || !field) return fail(400, "unknown_field");
  const ruleError = checkRules(branch, req, new Date(), STAFF_GRACE_MIN);
  if (ruleError) return fail(400, ruleError);
  const endMin = req.startMin + req.duration;
  try {
    const booking = await getStore().create({
      branch: branch.slug, fieldId: field.id, date: req.date, startMin: req.startMin, endMin, status: "confirmed",
      name: req.name, phone: req.phone, players: req.players, note: req.note, priceUsd: priceFor(field, req.startMin, endMin),
      source: "admin", telegramUserId: null, telegramUsername: null,
    });
    log("info", "admin_booking_created", { id: booking.id, by: check.user?.id ?? "local" });
    return json({ booking }, 201);
  } catch (error) {
    if (error instanceof SlotTakenError) return fail(409, "slot_taken");
    log("error", "admin_booking_failed", { error: String(error) });
    return fail(503, "unavailable");
  }
}
