import { fail, json } from "@/server/http";
import { checkAdmin } from "@/server/telegram";

export const dynamic = "force-dynamic";

/** GET /api/admin/me: may this Telegram user open the staff screens? */
export async function GET(request: Request) {
  const check = checkAdmin(request);
  if (!check.ok) return fail(check.reason === "not_admin" ? 403 : 401, check.reason);
  return json({ ok: true, name: check.user?.firstName ?? "Local" });
}
