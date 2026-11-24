import type { AvailabilityBlock, Booking, Field, JoinRequest, MatchRequest, Notification, PaymentIntent, Team, User, Venue } from "../types";
import { STORAGE_KEYS, type StorageAdapter } from "./storage";
import { seedDb } from "./seed";

/** Bump when the seed shape changes so stale browsers reseed. */
export const MOCK_DB_VERSION = 7;
/** The demo data is time-relative, so reseed once it is this old. */
const MAX_AGE_MS = 6 * 86_400_000;

/* Rows are stored normalized, like SQL tables. Denormalized fields that the
 * API returns (authorName, targetName, lastMessage...) are joined in handlers. */
export interface ReviewRow {
  id: string;
  targetType: "venue" | "team";
  targetId: string;
  authorId: string;
  bookingId: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}
export interface ReportRow {
  id: string;
  reporterId: string;
  targetType: "venue" | "user" | "review" | "match";
  targetId: string;
  reason: "wrong_info" | "unsafe" | "no_show" | "abusive" | "scam" | "other";
  details: string;
  status: "open" | "resolved" | "dismissed";
  resolution: string | null;
  createdAt: string;
}
export interface ConversationRow {
  id: string;
  kind: "match" | "venue" | "support";
  title: string;
  matchRequestId: string | null;
  participantIds: string[];
  /** userId -> ISO time that user last read the thread */
  readAt: Record<string, string>;
  createdAt: string;
}
export interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}
export interface FavoriteRow {
  userId: string;
  venueId: string;
  createdAt: string;
}

export interface MockDb {
  version: number;
  seededAt: string;
  users: User[];
  /** userId -> password (plain text: this is a mock, never do this in a backend). */
  passwords: Record<string, string>;
  teams: Team[];
  venues: Venue[];
  fields: Field[];
  bookings: Booking[];
  blocks: AvailabilityBlock[];
  matchRequests: MatchRequest[];
  joinRequests: JoinRequest[];
  conversations: ConversationRow[];
  messages: MessageRow[];
  reviews: ReviewRow[];
  favorites: FavoriteRow[];
  notifications: Notification[];
  reports: ReportRow[];
  payments: Omit<PaymentIntent, "bookingStatus">[];
}

export async function loadDb(storage: StorageAdapter, now: Date): Promise<MockDb> {
  try {
    const raw = await storage.getItem(STORAGE_KEYS.mockDb);
    if (raw) {
      const db = JSON.parse(raw) as MockDb;
      const fresh = now.getTime() - Date.parse(db.seededAt) < MAX_AGE_MS;
      if (db.version === MOCK_DB_VERSION && fresh) return db;
    }
  } catch {
    // Corrupt or unavailable storage: fall through to a fresh seed.
  }
  const db = seedDb(now);
  await saveDb(storage, db);
  return db;
}

export async function saveDb(storage: StorageAdapter, db: MockDb): Promise<void> {
  try {
    await storage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(db));
  } catch {
    // Storage full or blocked (private mode): keep working from memory.
  }
}
