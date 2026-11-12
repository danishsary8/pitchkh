/** Joins that turn normalized rows into the denormalized shapes the API returns. */
import { APP } from "../../config";
import { canCancel, canReschedule } from "../../domain/rules";
import { generateSlots, validateRange } from "../../domain/slots";
import type { Booking, BookingDetail, Conversation, JoinRequestDetail, MatchRequest, MatchRequestDetail, Message, Report, Review, Team, User, Venue, VenueDetail, VenueSummary } from "../../types";
import type { ConversationRow, MessageRow, MockDb, ReportRow, ReviewRow } from "../db";
import { notFound } from "../server";

export const userName = (db: MockDb, id: string): string => db.users.find((u) => u.id === id)?.name ?? "Deleted user";

export function getVenue(db: MockDb, idOrSlug: string): Venue {
  const venue = db.venues.find((v) => v.id === idOrSlug || v.slug === idOrSlug);
  if (!venue) throw notFound("Venue");
  return venue;
}

export interface TimeWindow {
  date: string;
  from: string;
  to: string;
}

export function venueSummary(db: MockDb, venue: Venue, user: User | null, now: Date, window?: TimeWindow): VenueSummary {
  const fields = db.fields.filter((f) => f.venueId === venue.id && f.status === "active");
  const free = window
    ? fields.filter((field) => validateRange(generateSlots({ field, openingHours: venue.openingHours, date: window.date, bookings: db.bookings, blocks: db.blocks, now }), window.from, window.to) === null).length
    : null;
  return {
    ...venue,
    priceFromUsd: fields.length ? Math.min(...fields.map((f) => f.pricePerHourUsd)) : 0,
    fieldCount: fields.length,
    isFavorite: user ? db.favorites.some((f) => f.userId === user.id && f.venueId === venue.id) : false,
    availableFieldCount: free,
  };
}

export function venueDetail(db: MockDb, venue: Venue, user: User | null, now: Date): VenueDetail {
  return {
    ...venueSummary(db, venue, user, now),
    fields: db.fields.filter((f) => f.venueId === venue.id),
    owner: { id: venue.ownerId, name: userName(db, venue.ownerId) },
  };
}

export function bookingDetail(db: MockDb, b: Booking, now: Date): BookingDetail {
  const venue = getVenue(db, b.venueId);
  const field = db.fields.find((f) => f.id === b.fieldId);
  const customer = db.users.find((u) => u.id === b.userId);
  return {
    ...b,
    venue: { id: venue.id, slug: venue.slug, name: venue.name, nameKm: venue.nameKm, district: venue.district, province: venue.province, address: venue.address, photo: venue.photos[0] ?? null, phone: venue.phone, lat: venue.lat, lng: venue.lng },
    field: { id: b.fieldId, name: field?.name ?? "Removed field", position: field?.position ?? "", format: field?.format ?? "" },
    customer: { id: b.userId, name: customer?.name ?? "Deleted user", phone: customer?.phone ?? "" },
    canCancel: canCancel(b, now),
    canReschedule: canReschedule(b, now),
    reviewed: db.reviews.some((r) => r.bookingId === b.id && r.authorId === b.userId),
  };
}

export function getTeam(db: MockDb, id: string): Team {
  const team = db.teams.find((t) => t.id === id);
  if (!team) throw notFound("Team");
  return team;
}

export function matchDetail(db: MockDb, m: MatchRequest, user: User | null): MatchRequestDetail {
  const venue = getVenue(db, m.venueId);
  const isHost = user?.id === m.hostUserId;
  const all = db.joinRequests.filter((j) => j.matchRequestId === m.id);
  const accepted = all.find((j) => j.status === "accepted");
  const conversation = db.conversations.find((c) => c.matchRequestId === m.id && (!user || c.participantIds.includes(user.id)));
  const detail = (j: (typeof all)[number]): JoinRequestDetail => ({ ...j, team: getTeam(db, j.teamId), userName: userName(db, j.userId) });
  return {
    ...m,
    venue: { id: venue.id, slug: venue.slug, name: venue.name, nameKm: venue.nameKm, district: venue.district, province: venue.province, photo: venue.photos[0] ?? null },
    fieldName: db.fields.find((f) => f.id === m.fieldId)?.name ?? null,
    hostTeam: getTeam(db, m.hostTeamId),
    hostName: userName(db, m.hostUserId),
    isHost,
    myJoinRequest: user ? (all.find((j) => j.userId === user.id) ?? null) : null,
    joinRequests: isHost ? all.map(detail) : [],
    pendingCount: all.filter((j) => j.status === "pending").length,
    opponentTeam: accepted ? getTeam(db, accepted.teamId) : null,
    conversationId: user && conversation ? conversation.id : null,
  };
}

export function reviewOut(db: MockDb, r: ReviewRow): Review {
  const targetName = r.targetType === "venue" ? (db.venues.find((v) => v.id === r.targetId)?.name ?? "") : (db.teams.find((t) => t.id === r.targetId)?.name ?? "");
  return { ...r, targetName, authorName: userName(db, r.authorId) };
}

export function reportOut(db: MockDb, r: ReportRow): Report {
  const targetName =
    r.targetType === "venue" ? db.venues.find((v) => v.id === r.targetId)?.name
    : r.targetType === "user" ? db.users.find((u) => u.id === r.targetId)?.name
    : r.targetType === "review" ? db.reviews.find((x) => x.id === r.targetId)?.comment.slice(0, 60)
    : "Match request";
  return { ...r, reporterName: userName(db, r.reporterId), targetName: targetName ?? "Removed" };
}

export function messageOut(db: MockDb, m: MessageRow): Message {
  return { ...m, senderName: userName(db, m.senderId) };
}

export function conversationOut(db: MockDb, c: ConversationRow, user: User): Conversation {
  const messages = db.messages.filter((m) => m.conversationId === c.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = messages[messages.length - 1];
  const readAt = c.readAt[user.id] ?? "";
  // Venue and support threads are titled after the other person.
  const other = c.participantIds.find((id) => id !== user.id);
  const title = c.kind === "match" || !other || (c.kind === "venue" && user.role === "player") ? c.title : userName(db, other);
  return {
    id: c.id, kind: c.kind, title, matchRequestId: c.matchRequestId, participantIds: c.participantIds,
    lastMessage: last?.body ?? null, lastMessageAt: last?.createdAt ?? c.createdAt,
    unreadCount: messages.filter((m) => m.senderId !== user.id && Date.parse(m.createdAt) > (readAt ? Date.parse(readAt) : 0)).length,
  };
}

export const SERVICE_FEE_RATE = APP.serviceFeeRate;
