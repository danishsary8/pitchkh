import { after } from "next/server";
import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/booking-rules";
import { fail, json, log, readJson } from "@/server/http";
import { notifyCustomer } from "@/server/notify";
import { getStore, isUuid, SlotTakenError } from "@/server/store";
import { checkAdmin } from "@/server/telegram";

export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(BOOKING_STATUSES) });

/** PATCH /api/admin/bookings/:id { status } → confirm, cancel, or put a cancelled booking back. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = checkAdmin(request);
  if (!check.ok) return fail(check.reason === "not_admin" ? 403 : 401, check.reason);
  const { id } = await params;
  if (!isUuid(id)) return fail(404, "not_found");
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return fail(400, "invalid");
  try {
    const store = getStore();
    const before = await store.get(id);
    if (!before) return fail(404, "not_found");
    if (before.status === parsed.data.status) return json({ booking: before });
    const booking = await store.setStatus(id, parsed.data.status);
    if (!booking) return fail(404, "not_found");
    log("info", "booking_status", { id, from: before.status, to: booking.status, by: check.user?.id ?? "local" });
    after(() => notifyCustomer(booking));
    return json({ booking });
  } catch (error) {
    if (error instanceof SlotTakenError) return fail(409, "slot_taken");
    log("error", "booking_status_failed", { error: String(error) });
    return fail(503, "unavailable");
  }
}
