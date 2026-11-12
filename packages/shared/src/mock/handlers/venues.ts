import { ApiError } from "../../api/errors";
import { generateSlots } from "../../domain/slots";
import { weatherHintFor } from "../../domain/weather";
import * as s from "../../schemas";
import type { VenueSummary } from "../../types";
import { notFound, paginate, parse, type MockServer } from "../server";
import { getVenue, venueDetail, venueSummary, type TimeWindow } from "./expand";

export function registerVenueRoutes(server: MockServer): void {
  server.route("GET", "/venues", "public", ({ db, query, user, now }) => {
    const q = parse(s.VenueListQuery, query);
    const window: TimeWindow | undefined = q.date && q.from && q.to ? { date: q.date, from: q.from, to: q.to } : undefined;
    const text = q.q?.toLowerCase();

    let rows: VenueSummary[] = db.venues
      .filter((v) => v.status === "approved")
      .filter((v) => !q.sport || v.sports.includes(q.sport))
      .filter((v) => !q.province || v.province === q.province)
      .filter((v) => !q.district || v.district === q.district)
      .filter((v) => q.featured === undefined || v.featured === q.featured)
      .filter((v) => !text || `${v.name} ${v.nameKm} ${v.district} ${v.address}`.toLowerCase().includes(text))
      .map((v) => venueSummary(db, v, user, now, window));

    // Price filters compare against the cheapest field of the chosen sport.
    if (q.sport) {
      rows = rows.map((v) => {
        const prices = db.fields.filter((f) => f.venueId === v.id && f.sport === q.sport && f.status === "active").map((f) => f.pricePerHourUsd);
        return prices.length ? { ...v, priceFromUsd: Math.min(...prices) } : v;
      });
    }
    rows = rows
      .filter((v) => q.minPrice === undefined || v.priceFromUsd >= q.minPrice)
      .filter((v) => q.maxPrice === undefined || v.priceFromUsd <= q.maxPrice)
      .filter((v) => !q.favorites || v.isFavorite)
      .filter((v) => !window || (v.availableFieldCount ?? 0) > 0);

    const score = (v: VenueSummary): number => (v.featured ? 2 : 0) + (v.verified ? 1 : 0) + v.rating / 5;
    const sorters: Record<typeof q.sort, (a: VenueSummary, b: VenueSummary) => number> = {
      recommended: (a, b) => score(b) - score(a),
      price_asc: (a, b) => a.priceFromUsd - b.priceFromUsd,
      price_desc: (a, b) => b.priceFromUsd - a.priceFromUsd,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return paginate(rows.sort(sorters[q.sort]), q.page, q.pageSize);
  });

  server.route("GET", "/venues/:id", "public", ({ db, params, user, now }) => {
    const venue = getVenue(db, params.id ?? "");
    const canSeeUnapproved = user && (user.role === "admin" || user.id === venue.ownerId);
    if (venue.status !== "approved" && !canSeeUnapproved) throw notFound("Venue");
    return venueDetail(db, venue, user, now);
  });

  server.route("GET", "/fields/:id/availability", "public", ({ db, params, query, now }) => {
    const { date } = parse(s.AvailabilityQuery, query);
    const field = db.fields.find((f) => f.id === params.id);
    if (!field) throw notFound("Field");
    const venue = getVenue(db, field.venueId);
    return generateSlots({ field, openingHours: venue.openingHours, date, bookings: db.bookings, blocks: db.blocks, now });
  });

  server.route("GET", "/weather", "public", ({ query }) => {
    const q = parse(s.WeatherQuery, query);
    return weatherHintFor(q.province, q.date);
  });

  server.route("PUT", "/favorites/:venueId", "auth", ({ db, params, requireUser, nowIso }) => {
    const user = requireUser();
    const venue = getVenue(db, params.venueId ?? "");
    if (!db.favorites.some((f) => f.userId === user.id && f.venueId === venue.id)) db.favorites.push({ userId: user.id, venueId: venue.id, createdAt: nowIso });
    return { venueId: venue.id, isFavorite: true };
  });

  server.route("DELETE", "/favorites/:venueId", "auth", ({ db, params, requireUser }) => {
    const user = requireUser();
    db.favorites = db.favorites.filter((f) => !(f.userId === user.id && f.venueId === params.venueId));
    return { venueId: params.venueId, isFavorite: false };
  });

  server.route("POST", "/reports", "auth", ({ db, body, requireUser, nowIso, newId }) => {
    const user = requireUser();
    const dto = parse(s.CreateReportDto, body);
    if (db.reports.some((r) => r.reporterId === user.id && r.targetId === dto.targetId && r.status === "open")) {
      throw new ApiError(409, "conflict", "You already reported this. Our team is reviewing it.");
    }
    const row = { id: newId(), reporterId: user.id, ...dto, status: "open" as const, resolution: null, createdAt: nowIso };
    db.reports.unshift(row);
    return { id: row.id };
  });
}
