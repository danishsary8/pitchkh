import { ApiError } from "../../api/errors";
import { round2 } from "../../domain/pricing";
import { dateInPP } from "../../domain/time";
import * as s from "../../schemas";
import { PROVINCES, SPORTS } from "../../schemas/common";
import type { AdminAnalytics } from "../../types";
import { notFound, paginate, parse, type MockServer } from "../server";
import { reportOut, venueDetail } from "./expand";
import { dayPoints, earns } from "./owner";

const ADMIN = ["admin"] as const;

export function registerAdminRoutes(server: MockServer): void {
  server.route("GET", "/admin/analytics", ADMIN, ({ db, now }): AdminAnalytics => {
    const paid = db.bookings.filter(earns);
    const sum = (rows: typeof paid): number => round2(rows.reduce((total, b) => total + b.price.totalUsd, 0));
    return {
      users: db.users.length, players: db.users.filter((u) => u.role === "player").length, owners: db.users.filter((u) => u.role === "owner").length,
      venues: db.venues.filter((v) => v.status === "approved").length, pendingVenues: db.venues.filter((v) => v.status === "pending").length,
      bookings: paid.length, gmvUsd: sum(paid), platformFeesUsd: round2(paid.reduce((total, b) => total + b.price.serviceFeeUsd, 0)),
      openMatches: db.matchRequests.filter((m) => m.status === "open").length, openReports: db.reports.filter((r) => r.status === "open").length,
      bySport: SPORTS.map((sport) => ({ sport, bookings: paid.filter((b) => b.sport === sport).length, revenueUsd: sum(paid.filter((b) => b.sport === sport)) })),
      byProvince: PROVINCES.map((province) => {
        const ids = new Set(db.venues.filter((v) => v.province === province && v.status === "approved").map((v) => v.id));
        return { province, venues: ids.size, bookings: paid.filter((b) => ids.has(b.venueId)).length };
      }),
      byDay: dayPoints(db.bookings, dateInPP(now), 14),
    };
  });

  server.route("GET", "/admin/venues", ADMIN, ({ db, query, user, now }) => {
    const q = parse(s.AdminVenueListQuery, query);
    const text = q.q?.toLowerCase();
    const rows = db.venues
      .filter((v) => !q.status || v.status === q.status)
      .filter((v) => !text || v.name.toLowerCase().includes(text))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((v) => venueDetail(db, v, user, now));
    return paginate(rows, q.page, q.pageSize);
  });

  server.route("POST", "/admin/venues/:id/moderate", ADMIN, ({ db, params, body, user, now, notify }) => {
    const dto = parse(s.ModerateVenueDto, body);
    const venue = db.venues.find((v) => v.id === params.id);
    if (!venue) throw notFound("Venue");
    venue.status = dto.status;
    venue.moderationNote = dto.status === "approved" ? null : (dto.note ?? null);
    if (dto.status === "approved") venue.verified = true;
    else venue.featured = false;
    notify(venue.ownerId, dto.status === "approved" ? "venue_approved" : "venue_rejected", { venue: venue.name }, "/owner/venues");
    return venueDetail(db, venue, user, now);
  });

  server.route("POST", "/admin/venues/:id/feature", ADMIN, ({ db, params, body, user, now }) => {
    const { featured } = parse(s.FeatureVenueDto, body);
    const venue = db.venues.find((v) => v.id === params.id);
    if (!venue) throw notFound("Venue");
    if (featured && venue.status !== "approved") throw new ApiError(409, "conflict", "Only approved venues can be featured.");
    venue.featured = featured;
    return venueDetail(db, venue, user, now);
  });

  server.route("GET", "/admin/users", ADMIN, ({ db, query }) => {
    const q = parse(s.AdminUserListQuery, query);
    const text = q.q?.toLowerCase();
    const rows = db.users
      .filter((u) => !q.role || u.role === q.role)
      .filter((u) => !q.status || u.status === q.status)
      .filter((u) => !text || `${u.name} ${u.email}`.toLowerCase().includes(text))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(rows, q.page, q.pageSize);
  });

  server.route("PATCH", "/admin/users/:id/status", ADMIN, ({ db, params, body, requireUser }) => {
    const { status } = parse(s.UpdateUserStatusDto, body);
    const target = db.users.find((u) => u.id === params.id);
    if (!target) throw notFound("User");
    if (target.id === requireUser().id) throw new ApiError(409, "conflict", "You cannot suspend your own account.");
    target.status = status;
    return target;
  });

  server.route("GET", "/admin/reports", ADMIN, ({ db, query }) => {
    const q = parse(s.ReportListQuery, query);
    const rows = db.reports.filter((r) => !q.status || r.status === q.status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => reportOut(db, r));
    return paginate(rows, q.page, q.pageSize);
  });

  server.route("POST", "/admin/reports/:id/resolve", ADMIN, ({ db, params, body }) => {
    const dto = parse(s.ResolveReportDto, body);
    const report = db.reports.find((r) => r.id === params.id);
    if (!report) throw notFound("Report");
    report.status = dto.status;
    report.resolution = dto.resolution || null;
    return reportOut(db, report);
  });
}
