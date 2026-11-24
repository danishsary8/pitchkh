import { z } from "zod";
import { NOTIFICATION_TYPES, REPORT_REASONS } from "../enums";
import { DateStr, Id, IsoDateTime, PageQuery, Province, Role, Sport } from "./common";
import { UserStatus } from "./user";

export { NOTIFICATION_TYPES, REPORT_REASONS };

/* ----------------------------- Reviews ----------------------------- */
export const ReviewTarget = z.enum(["venue", "team"]);
export const Review = z.object({
  id: Id,
  /** "venue" = venue rating, "team" = opponent sportsmanship rating */
  targetType: ReviewTarget,
  targetId: Id,
  targetName: z.string(),
  authorId: Id,
  authorName: z.string(),
  bookingId: Id.nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(600),
  createdAt: IsoDateTime,
});
export const CreateReviewDto = z.object({
  targetType: ReviewTarget,
  targetId: Id,
  bookingId: Id.nullable().default(null),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(600).default(""),
});
export const ReviewListQuery = PageQuery.extend({
  targetType: ReviewTarget.optional(),
  targetId: Id.optional(),
  authorId: Id.optional(),
});

/* -------------------------- Notifications -------------------------- */
export const Notification = z.object({
  id: Id,
  userId: Id,
  type: z.enum(NOTIFICATION_TYPES),
  /** Values interpolated into the localized notification text. */
  params: z.record(z.string(), z.string()),
  /** App-relative path to open, e.g. /account/bookings */
  href: z.string(),
  read: z.boolean(),
  createdAt: IsoDateTime,
});

/* ----------------------------- Reports ----------------------------- */
export const ReportTarget = z.enum(["venue", "user", "review", "match"]);
export const ReportStatus = z.enum(["open", "resolved", "dismissed"]);
export const Report = z.object({
  id: Id,
  reporterId: Id,
  reporterName: z.string(),
  targetType: ReportTarget,
  targetId: Id,
  targetName: z.string(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(600),
  status: ReportStatus,
  resolution: z.string().nullable(),
  createdAt: IsoDateTime,
});
export const CreateReportDto = z.object({
  targetType: ReportTarget,
  targetId: Id,
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(600).default(""),
});
export const ResolveReportDto = z.object({
  status: z.enum(["resolved", "dismissed"]),
  resolution: z.string().max(400).default(""),
});
export const ReportListQuery = PageQuery.extend({ status: ReportStatus.optional() });

/* ----------------------------- Weather ----------------------------- */
export const WeatherCondition = z.enum(["sunny", "partly_cloudy", "cloudy", "showers", "storm"]);
export const WeatherHint = z.object({
  date: DateStr,
  province: Province,
  condition: WeatherCondition,
  tempMinC: z.number(),
  tempMaxC: z.number(),
  /** 0..1 */
  rainChance: z.number(),
  /** Which advice text to show. */
  advice: z.enum(["great", "hot", "rain_likely", "storm"]),
});
export const WeatherQuery = z.object({ province: Province, date: DateStr });

/* ------------------------- Owner dashboards ------------------------ */
export const DayPoint = z.object({ date: DateStr, bookings: z.number().int(), revenueUsd: z.number() });
export const OwnerEarnings = z.object({
  totalUsd: z.number(),
  thisMonthUsd: z.number(),
  lastMonthUsd: z.number(),
  pendingPayoutUsd: z.number(),
  bookingsCount: z.number().int(),
  pendingRequests: z.number().int(),
  /** Booked hours / open hours over the last 14 days, 0..1 */
  occupancyRate: z.number(),
  bySport: z.array(z.object({ sport: Sport, revenueUsd: z.number(), bookings: z.number().int() })),
  byField: z.array(z.object({ fieldId: Id, fieldName: z.string(), venueName: z.string(), revenueUsd: z.number(), bookings: z.number().int() })),
  byDay: z.array(DayPoint),
  byPaymentMethod: z.array(z.object({ method: z.string(), revenueUsd: z.number() })),
});

/* ------------------------------ Admin ------------------------------ */
export const AdminAnalytics = z.object({
  users: z.number().int(),
  players: z.number().int(),
  owners: z.number().int(),
  venues: z.number().int(),
  pendingVenues: z.number().int(),
  bookings: z.number().int(),
  gmvUsd: z.number(),
  platformFeesUsd: z.number(),
  openMatches: z.number().int(),
  openReports: z.number().int(),
  bySport: z.array(z.object({ sport: Sport, bookings: z.number().int(), revenueUsd: z.number() })),
  byProvince: z.array(z.object({ province: Province, venues: z.number().int(), bookings: z.number().int() })),
  byDay: z.array(DayPoint),
});
export const AdminUserListQuery = PageQuery.extend({
  q: z.string().trim().optional(),
  role: Role.optional(),
  status: UserStatus.optional(),
});
export const UpdateUserStatusDto = z.object({ status: UserStatus });
export const AdminVenueListQuery = PageQuery.extend({
  status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
  q: z.string().trim().optional(),
});

/* ----------------------------- Telegram ----------------------------- */
/** An owner's Telegram alerts: is the bot set up, is their chat linked, and the link that connects it. */
export const TelegramStatus = z.object({
  /** False when the server has no bot configured. */
  enabled: z.boolean(),
  linked: z.boolean(),
  /** t.me/<bot>?start=<one-time code>; null when disabled or already linked. */
  linkUrl: z.string().nullable(),
});
