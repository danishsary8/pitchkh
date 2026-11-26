import { json } from "@/server/http";
import { getStore } from "@/server/store";

export const dynamic = "force-dynamic";

/** GET /api/health → 200 when the database answers. Point an uptime monitor here. */
export async function GET() {
  const checks = { database: process.env.DATABASE_URL ? "postgres" : "memory", bot: !!process.env.TELEGRAM_BOT_TOKEN, admins: (process.env.ADMIN_TELEGRAM_IDS ?? "").split(",").filter((s) => s.trim()).length };
  try {
    await getStore().ping();
    return json({ ok: true, ...checks });
  } catch {
    return json({ ok: false, ...checks }, 503);
  }
}
