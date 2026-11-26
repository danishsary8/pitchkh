import { bookableDates } from "@/lib/booking-rules";
import { findBranch } from "@/lib/branches";
import { fail, json, log } from "@/server/http";
import { getStore } from "@/server/store";

export const dynamic = "force-dynamic";

/** GET /api/branches/:slug/taken?date=YYYY-MM-DD → which pitches are taken when. Nothing personal. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const branch = findBranch(slug);
  if (!branch) return fail(404, "unknown_branch");
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!bookableDates().includes(date)) return fail(400, "bad_date");
  try {
    return json({ date, taken: await getStore().taken(branch.slug, date) });
  } catch (error) {
    log("error", "taken_failed", { error: String(error) });
    return fail(503, "unavailable");
  }
}
