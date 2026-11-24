/**
 * Typed table definitions for Drizzle queries. The source of truth for the
 * structure (constraints, indexes) is migrations/*.sql; keep both in step.
 */
import type { Extras, FieldLayout, OpeningHours, PriceBreakdown } from "@pitchkh/shared";
import { bigint, boolean, date, doublePrecision, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const money = (name: string) => numeric(name, { precision: 10, scale: 2, mode: "number" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  role: text("role").$type<"player" | "owner" | "admin">().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  locale: text("locale").$type<"en" | "km">().notNull(),
  status: text("status").$type<"active" | "suspended">().notNull(),
  teamId: uuid("team_id"),
  homeProvince: text("home_province").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  nameKm: text("name_km").notNull(),
  description: text("description").notNull(),
  descriptionKm: text("description_km").notNull(),
  province: text("province").notNull(),
  district: text("district").notNull(),
  address: text("address").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  sports: text("sports").array().notNull(),
  photos: text("photos").array().notNull(),
  amenities: text("amenities").array().notNull(),
  openingHours: jsonb("opening_hours").$type<OpeningHours[]>().notNull(),
  phone: text("phone").notNull(),
  rating: numeric("rating", { precision: 2, scale: 1, mode: "number" }).notNull(),
  reviewCount: integer("review_count").notNull(),
  verified: boolean("verified").notNull(),
  featured: boolean("featured").notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected" | "suspended">().notNull(),
  moderationNote: text("moderation_note"),
  createdAt: ts("created_at").notNull(),
});

export const fields = pgTable("fields", {
  id: uuid("id").primaryKey(),
  venueId: uuid("venue_id").notNull(),
  sport: text("sport").$type<"football" | "volleyball" | "tennis">().notNull(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  surface: text("surface").notNull(),
  indoor: boolean("indoor").notNull(),
  format: text("format").notNull(),
  maxPlayers: integer("max_players").notNull(),
  pricePerHourUsd: money("price_per_hour_usd").notNull(),
  peakPricePerHourUsd: money("peak_price_per_hour_usd").notNull(),
  lit: boolean("lit").notNull(),
  status: text("status").$type<"active" | "maintenance">().notNull(),
  layout: jsonb("layout").$type<FieldLayout | null>(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey(),
  code: text("code").notNull(),
  userId: uuid("user_id").notNull(),
  venueId: uuid("venue_id").notNull(),
  fieldId: uuid("field_id").notNull(),
  sport: text("sport").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  teamSize: integer("team_size").notNull(),
  referee: boolean("referee").notNull(),
  extras: jsonb("extras").$type<Extras>().notNull(),
  notes: text("notes").notNull(),
  opponentMode: text("opponent_mode").$type<"have" | "find">().notNull(),
  matchRequestId: uuid("match_request_id"),
  price: jsonb("price").$type<PriceBreakdown>().notNull(),
  paymentMethod: text("payment_method").$type<"khqr" | "aba" | "wing" | "cash">().notNull(),
  paymentStatus: text("payment_status").$type<"unpaid" | "paid" | "refunded">().notNull(),
  status: text("status").$type<"awaiting_payment" | "pending" | "confirmed" | "rejected" | "cancelled" | "completed">().notNull(),
  createdAt: ts("created_at").notNull(),
  cancelledAt: ts("cancelled_at"),
  paymentDueAt: ts("payment_due_at"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey(),
  bookingId: uuid("booking_id").notNull(),
  provider: text("provider").notNull(),
  method: text("method").$type<"khqr" | "aba" | "wing" | "cash">().notNull(),
  reference: text("reference").notNull(),
  amountUsd: money("amount_usd").notNull(),
  amountKhr: integer("amount_khr").notNull(),
  status: text("status").$type<"pending" | "paid" | "expired">().notNull(),
  qrPayload: text("qr_payload"),
  deeplink: text("deeplink"),
  expiresAt: ts("expires_at").notNull(),
  paidAt: ts("paid_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const blocks = pgTable("availability_blocks", {
  id: uuid("id").primaryKey(),
  fieldId: uuid("field_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  reason: text("reason").notNull(),
});

export const favorites = pgTable("favorites", {
  userId: uuid("user_id").notNull(),
  venueId: uuid("venue_id").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.venueId] })]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  params: jsonb("params").$type<Record<string, string>>().notNull(),
  href: text("href").notNull(),
  read: boolean("read").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey(),
  reporterId: uuid("reporter_id").notNull(),
  targetType: text("target_type").$type<"venue" | "user" | "review" | "match">().notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull(),
  status: text("status").$type<"open" | "resolved" | "dismissed">().notNull(),
  resolution: text("resolution"),
  createdAt: ts("created_at").notNull(),
});

export const telegramLinks = pgTable("telegram_links", {
  userId: uuid("user_id").primaryKey(),
  chatId: bigint("chat_id", { mode: "number" }),
  linkCode: text("link_code").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").$type<"football" | "volleyball">().notNull(),
  captainId: uuid("captain_id").notNull(),
  level: text("level").$type<"beginner" | "intermediate" | "advanced">().notNull(),
  memberCount: integer("member_count").notNull(),
  color: text("color").notNull(),
  bio: text("bio").notNull(),
  homeProvince: text("home_province").notNull(),
  matchesPlayed: integer("matches_played").notNull(),
  wins: integer("wins").notNull(),
  sportsmanship: numeric("sportsmanship", { precision: 2, scale: 1, mode: "number" }).notNull(),
  sportsmanshipCount: integer("sportsmanship_count").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const matchRequests = pgTable("match_requests", {
  id: uuid("id").primaryKey(),
  hostUserId: uuid("host_user_id").notNull(),
  hostTeamId: uuid("host_team_id").notNull(),
  sport: text("sport").$type<"football" | "volleyball">().notNull(),
  venueId: uuid("venue_id").notNull(),
  fieldId: uuid("field_id"),
  bookingId: uuid("booking_id"),
  date: date("date", { mode: "string" }).notNull(),
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  level: text("level").$type<"beginner" | "intermediate" | "advanced">().notNull(),
  teamSize: integer("team_size").notNull(),
  costSplit: text("cost_split").$type<"split" | "host_pays" | "loser_pays">().notNull(),
  note: text("note").notNull(),
  status: text("status").$type<"open" | "matched" | "cancelled" | "expired">().notNull(),
  createdAt: ts("created_at").notNull(),
});

export const joinRequests = pgTable("join_requests", {
  id: uuid("id").primaryKey(),
  matchRequestId: uuid("match_request_id").notNull(),
  userId: uuid("user_id").notNull(),
  teamId: uuid("team_id").notNull(),
  message: text("message").notNull(),
  status: text("status").$type<"pending" | "accepted" | "declined">().notNull(),
  createdAt: ts("created_at").notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey(),
  kind: text("kind").$type<"match" | "venue" | "support">().notNull(),
  title: text("title").notNull(),
  matchRequestId: uuid("match_request_id"),
  participantIds: uuid("participant_ids").array().notNull(),
  readAt: jsonb("read_at").$type<Record<string, string>>().notNull(),
  createdAt: ts("created_at").notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey(),
  conversationId: uuid("conversation_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  body: text("body").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey(),
  targetType: text("target_type").$type<"venue" | "team">().notNull(),
  targetId: uuid("target_id").notNull(),
  authorId: uuid("author_id").notNull(),
  bookingId: uuid("booking_id"),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: ts("created_at").notNull(),
});
