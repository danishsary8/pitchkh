/**
 * Database rows -> the JSON shapes in packages/shared/src/schemas.
 * Timestamps go out as ISO-8601 in Phnom Penh time (+07:00), like the mock.
 */
import { isoInPP, type AvailabilityBlock, type Booking, type Field, type JoinRequest, type MatchRequest, type Notification, type Province, type Team, type User, type Venue } from "@pitchkh/shared";
import type { ConversationRow, MessageRow, ReportRow, ReviewRow } from "@pitchkh/shared/mock";
import type * as t from "./schema";

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];

export const iso = (d: Date): string => isoInPP(d);

export function toUser(row: Row<typeof t.users>): User {
  // Listed field by field so a new column (like password_hash) can never leak out by accident.
  return {
    id: row.id, role: row.role, name: row.name, email: row.email, phone: row.phone, avatarUrl: row.avatarUrl, locale: row.locale,
    status: row.status, teamId: row.teamId, homeProvince: row.homeProvince as Province, createdAt: iso(row.createdAt),
  };
}

export function toVenue(row: Row<typeof t.venues>): Venue {
  return { ...row, createdAt: iso(row.createdAt) } as Venue;
}

export function toField(row: Row<typeof t.fields>): Field {
  return row as Field;
}

export function toBooking(row: Row<typeof t.bookings>): Booking {
  return {
    ...row,
    sport: row.sport as Booking["sport"],
    startAt: iso(row.startAt),
    endAt: iso(row.endAt),
    createdAt: iso(row.createdAt),
    cancelledAt: row.cancelledAt ? iso(row.cancelledAt) : null,
    paymentDueAt: row.paymentDueAt ? iso(row.paymentDueAt) : null,
  };
}

export function toBlock(row: Row<typeof t.blocks>): AvailabilityBlock {
  return row;
}

export function toNotification(row: Row<typeof t.notifications>): Notification {
  return { ...row, type: row.type as Notification["type"], createdAt: iso(row.createdAt) };
}

export function toReportRow(row: Row<typeof t.reports>): ReportRow {
  return { ...row, reason: row.reason as ReportRow["reason"], createdAt: iso(row.createdAt) };
}

export function toTeam(row: Row<typeof t.teams>): Team {
  return { ...row, homeProvince: row.homeProvince as Province, createdAt: iso(row.createdAt) };
}

export function toMatch(row: Row<typeof t.matchRequests>): MatchRequest {
  return { ...row, startAt: iso(row.startAt), endAt: iso(row.endAt), createdAt: iso(row.createdAt) };
}

export function toJoin(row: Row<typeof t.joinRequests>): JoinRequest {
  return { ...row, createdAt: iso(row.createdAt) };
}

export function toConversationRow(row: Row<typeof t.conversations>): ConversationRow {
  return { ...row, createdAt: iso(row.createdAt) };
}

export function toMessageRow(row: Row<typeof t.messages>): MessageRow {
  return { ...row, createdAt: iso(row.createdAt) };
}

export function toReviewRow(row: Row<typeof t.reviews>): ReviewRow {
  return { ...row, createdAt: iso(row.createdAt) };
}
