/**
 * Database rows -> the JSON shapes in packages/shared/src/schemas.
 * Timestamps go out as ISO-8601 in Phnom Penh time (+07:00), like the mock.
 */
import { isoInPP, type AvailabilityBlock, type Booking, type Field, type Notification, type Province, type User, type Venue } from "@pitchkh/shared";
import type { ReportRow } from "@pitchkh/shared/mock";
import type * as t from "./schema";

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];

export const iso = (d: Date): string => isoInPP(d);

export function toUser(row: Row<typeof t.users>): User {
  const { passwordHash: _hidden, createdAt, homeProvince, ...rest } = row;
  return { ...rest, homeProvince: homeProvince as Province, createdAt: iso(createdAt) };
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
