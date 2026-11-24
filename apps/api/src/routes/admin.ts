import { ApiError, dateInPP, PROVINCES, round2, schemas as s, SPORTS, type AdminAnalytics } from "@pitchkh/shared";
import { dayPoints, earns, notFound, paginate, parse, reportOut } from "@pitchkh/shared/mock";
import { and, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { toBooking, toReportRow, toUser, toVenue } from "../db/mappers";
import * as t from "../db/schema";
import type { Ctx, Route } from "../http";
import { emptySnapshot, venueDetailOf, venueDetails } from "../views";

const ADMIN = ["admin"] as const;
const isId = (v: string | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

async function venueById(ctx: Ctx) {
  if (!isId(ctx.params.id)) throw notFound("Venue");
  const [row] = await ctx.db.select().from(t.venues).where(eq(t.venues.id, ctx.params.id));
  if (!row) throw notFound("Venue");
  return toVenue(row);
}

/** Report rows with reporter and target names joined in. */
async function reportsOut(ctx: Ctx, rows: (typeof t.reports.$inferSelect)[]) {
  const snap = emptySnapshot();
  const reports = rows.map(toReportRow);
  const userIds = [...new Set(reports.flatMap((r) => (r.targetType === "user" ? [r.reporterId, r.targetId] : [r.reporterId])))];
  const venueIds = reports.filter((r) => r.targetType === "venue").map((r) => r.targetId);
  if (userIds.length) snap.users = (await ctx.db.select().from(t.users).where(inArray(t.users.id, userIds))).map(toUser);
  if (venueIds.length) snap.venues = (await ctx.db.select().from(t.venues).where(inArray(t.venues.id, venueIds))).map(toVenue);
  return reports.map((r) => reportOut(snap, r));
}

export function registerAdminRoutes(route: Route): void {
  route("GET", "/admin/analytics", ADMIN, async ({ db, now }): Promise<AdminAnalytics> => {
    const users = await db.select({ role: t.users.role }).from(t.users);
    const venues = await db.select({ id: t.venues.id, status: t.venues.status, province: t.venues.province }).from(t.venues);
    const bookings = (await db.select().from(t.bookings)).map(toBooking);
    const openReports = await db.select({ id: t.reports.id }).from(t.reports).where(eq(t.reports.status, "open"));
    const paid = bookings.filter(earns);
    const sum = (rows: typeof paid): number => round2(rows.reduce((total, b) => total + b.price.totalUsd, 0));
    return {
      users: users.length, players: users.filter((u) => u.role === "player").length, owners: users.filter((u) => u.role === "owner").length,
      venues: venues.filter((v) => v.status === "approved").length, pendingVenues: venues.filter((v) => v.status === "pending").length,
      bookings: paid.length, gmvUsd: sum(paid), platformFeesUsd: round2(paid.reduce((total, b) => total + b.price.serviceFeeUsd, 0)),
      openMatches: 0, // match requests arrive in v1.1
      openReports: openReports.length,
      bySport: SPORTS.map((sport) => ({ sport, bookings: paid.filter((b) => b.sport === sport).length, revenueUsd: sum(paid.filter((b) => b.sport === sport)) })),
      byProvince: PROVINCES.map((province) => {
        const ids = new Set(venues.filter((v) => v.province === province && v.status === "approved").map((v) => v.id));
        return { province, venues: ids.size, bookings: paid.filter((b) => ids.has(b.venueId)).length };
      }),
      byDay: dayPoints(bookings, dateInPP(now), 14),
    };
  });

  route("GET", "/admin/venues", ADMIN, async (ctx) => {
    const q = parse(s.AdminVenueListQuery, ctx.query);
    const where: SQL[] = [];
    if (q.status) where.push(eq(t.venues.status, q.status));
    if (q.q) where.push(ilike(t.venues.name, `%${q.q.replace(/[%_\\]/g, "\\$&")}%`));
    const rows = (await ctx.db.select().from(t.venues).where(where.length ? and(...where) : undefined).orderBy(desc(t.venues.createdAt))).map(toVenue);
    const page = paginate(rows, q.page, q.pageSize);
    return { ...page, data: await venueDetails(ctx.db, page.data, ctx.user, ctx.now) };
  });

  route("POST", "/admin/venues/:id/moderate", ADMIN, async (ctx) => {
    const dto = parse(s.ModerateVenueDto, ctx.body);
    const venue = await venueById(ctx);
    const approved = dto.status === "approved";
    const updated = await ctx.db.transaction(async (tx) => {
      const [row] = await tx.update(t.venues).set({ status: dto.status, moderationNote: approved ? null : (dto.note ?? null), ...(approved ? { verified: true } : { featured: false }) }).where(eq(t.venues.id, venue.id)).returning();
      await ctx.notify(tx, venue.ownerId, approved ? "venue_approved" : "venue_rejected", { venue: venue.name }, "/owner/venues");
      return toVenue(row as typeof t.venues.$inferSelect);
    });
    return venueDetailOf(ctx.db, updated, ctx.user, ctx.now);
  });

  route("POST", "/admin/venues/:id/feature", ADMIN, async (ctx) => {
    const { featured } = parse(s.FeatureVenueDto, ctx.body);
    const venue = await venueById(ctx);
    if (featured && venue.status !== "approved") throw new ApiError(409, "conflict", "Only approved venues can be featured.");
    const [row] = await ctx.db.update(t.venues).set({ featured }).where(eq(t.venues.id, venue.id)).returning();
    return venueDetailOf(ctx.db, toVenue(row as typeof t.venues.$inferSelect), ctx.user, ctx.now);
  });

  route("GET", "/admin/users", ADMIN, async ({ db, query }) => {
    const q = parse(s.AdminUserListQuery, query);
    const where: SQL[] = [];
    if (q.role) where.push(eq(t.users.role, q.role));
    if (q.status) where.push(eq(t.users.status, q.status));
    if (q.q) {
      const like = `%${q.q.replace(/[%_\\]/g, "\\$&")}%`;
      where.push(or(ilike(t.users.name, like), ilike(t.users.email, like)) as SQL);
    }
    const rows = (await db.select().from(t.users).where(where.length ? and(...where) : undefined).orderBy(desc(t.users.createdAt))).map(toUser);
    return paginate(rows, q.page, q.pageSize);
  });

  route("PATCH", "/admin/users/:id/status", ADMIN, async ({ db, params, body, requireUser }) => {
    const { status } = parse(s.UpdateUserStatusDto, body);
    if (!isId(params.id)) throw notFound("User");
    if (params.id === requireUser().id) throw new ApiError(409, "conflict", "You cannot suspend your own account.");
    const [row] = await db.update(t.users).set({ status }).where(eq(t.users.id, params.id)).returning();
    if (!row) throw notFound("User");
    // Suspending also ends every session.
    if (status === "suspended") await db.delete(t.refreshTokens).where(eq(t.refreshTokens.userId, row.id));
    return toUser(row);
  });

  route("GET", "/admin/reports", ADMIN, async (ctx) => {
    const q = parse(s.ReportListQuery, ctx.query);
    const rows = await ctx.db.select().from(t.reports).where(q.status ? eq(t.reports.status, q.status) : undefined).orderBy(desc(t.reports.createdAt));
    const page = paginate(rows, q.page, q.pageSize);
    return { ...page, data: await reportsOut(ctx, page.data) };
  });

  route("POST", "/admin/reports/:id/resolve", ADMIN, async (ctx) => {
    const dto = parse(s.ResolveReportDto, ctx.body);
    if (!isId(ctx.params.id)) throw notFound("Report");
    const [row] = await ctx.db.update(t.reports).set({ status: dto.status, resolution: dto.resolution || null }).where(and(eq(t.reports.id, ctx.params.id))).returning();
    if (!row) throw notFound("Report");
    return (await reportsOut(ctx, [row]))[0];
  });
}
