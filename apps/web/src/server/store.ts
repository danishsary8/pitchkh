import "server-only";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { bookingCode, overlaps, type Booking, type BookingStatus, type TakenSlot } from "@/lib/booking-rules";

/**
 * Where bookings live. With DATABASE_URL set (production) they are stored in
 * Postgres; without it (local development) in memory, which resets on restart.
 *
 * Double bookings are impossible in Postgres: an exclusion constraint rejects
 * any two live bookings on the same pitch whose times overlap, even if two
 * customers press "Send" at the same instant.
 */

export class SlotTakenError extends Error {
  constructor() {
    super("slot_taken");
  }
}

export type NewBooking = Omit<Booking, "id" | "code" | "createdAt">;

export interface BookingStore {
  taken(branch: string, date: string): Promise<TakenSlot[]>;
  create(input: NewBooking): Promise<Booking>;
  listDay(branch: string, date: string): Promise<Booking[]>;
  listPending(fromDate: string): Promise<Booking[]>;
  get(id: string): Promise<Booking | null>;
  setStatus(id: string, status: BookingStatus): Promise<Booking | null>;
  ping(): Promise<void>;
}

// ---------------------------------------------------------------- memory

function memoryStore(): BookingStore {
  const g = globalThis as unknown as { __pitchkhBookings?: Map<string, Booking> };
  const rows = (g.__pitchkhBookings ??= new Map());
  const live = (b: Booking): boolean => b.status !== "cancelled";
  const sort = (list: Booking[]): Booking[] => list.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  return {
    async taken(branch, date) {
      return [...rows.values()].filter((b) => b.branch === branch && b.date === date && live(b)).map(({ fieldId, startMin, endMin }) => ({ fieldId, startMin, endMin }));
    },
    async create(input) {
      const clash = [...rows.values()].some((b) => live(b) && b.fieldId === input.fieldId && b.date === input.date && overlaps(b, input));
      if (clash) throw new SlotTakenError();
      const booking: Booking = { ...input, id: randomUUID(), code: bookingCode(), createdAt: new Date().toISOString() };
      rows.set(booking.id, booking);
      return booking;
    },
    async listDay(branch, date) {
      return sort([...rows.values()].filter((b) => b.branch === branch && b.date === date));
    },
    async listPending(fromDate) {
      return sort([...rows.values()].filter((b) => b.status === "pending" && b.date >= fromDate));
    },
    async get(id) {
      return rows.get(id) ?? null;
    },
    async setStatus(id, status) {
      const booking = rows.get(id);
      if (!booking) return null;
      if (status !== "cancelled" && booking.status === "cancelled") {
        const clash = [...rows.values()].some((b) => b.id !== id && live(b) && b.fieldId === booking.fieldId && b.date === booking.date && overlaps(b, booking));
        if (clash) throw new SlotTakenError();
      }
      const next = { ...booking, status };
      rows.set(id, next);
      return next;
    },
    async ping() {},
  };
}

// ---------------------------------------------------------------- postgres

/** Kept in sync with db/schema.sql. Safe to run on every cold start. */
const SCHEMA = [
  `CREATE EXTENSION IF NOT EXISTS btree_gist`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    branch text NOT NULL,
    field_id text NOT NULL,
    date date NOT NULL,
    start_min int NOT NULL CHECK (start_min >= 0 AND start_min < 1440),
    end_min int NOT NULL CHECK (end_min > start_min AND end_min <= 1440),
    status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    name text NOT NULL,
    phone text NOT NULL,
    players int NOT NULL CHECK (players BETWEEN 1 AND 40),
    note text NOT NULL DEFAULT '',
    price_usd numeric(8, 2) NOT NULL,
    source text NOT NULL CHECK (source IN ('customer', 'admin')),
    telegram_user_id text,
    telegram_username text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
      field_id WITH =, date WITH =, int4range(start_min, end_min) WITH &&
    ) WHERE (status <> 'cancelled')
  )`,
  `CREATE INDEX IF NOT EXISTS bookings_branch_date ON bookings (branch, date)`,
  `CREATE INDEX IF NOT EXISTS bookings_pending ON bookings (date) WHERE status = 'pending'`,
];

type Row = Record<string, unknown>;

const toBooking = (r: Row): Booking => ({
  id: String(r.id),
  code: String(r.code),
  branch: String(r.branch),
  fieldId: String(r.field_id),
  // `date` is selected as text, so no timezone shifts.
  date: String(r.date),
  startMin: Number(r.start_min),
  endMin: Number(r.end_min),
  status: r.status as BookingStatus,
  name: String(r.name),
  phone: String(r.phone),
  players: Number(r.players),
  note: String(r.note ?? ""),
  priceUsd: Number(r.price_usd),
  source: r.source as Booking["source"],
  telegramUserId: r.telegram_user_id ? String(r.telegram_user_id) : null,
  telegramUsername: r.telegram_username ? String(r.telegram_username) : null,
  createdAt: new Date(String(r.created_at)).toISOString(),
});

const COLUMNS = `id, code, branch, field_id, date::text AS date, start_min, end_min, status, name, phone, players, note, price_usd, source, telegram_user_id, telegram_username, created_at`;

const isOverlap = (error: unknown): boolean => (error as { code?: string })?.code === "23P01";
const isDuplicateCode = (error: unknown): boolean => (error as { code?: string; constraint?: string })?.code === "23505";

function postgresStore(url: string): BookingStore {
  const sql = neon(url);
  let ready: Promise<void> | null = null;
  const ensure = (): Promise<void> =>
    (ready ??= (async () => {
      for (const statement of SCHEMA) await sql.query(statement);
    })().catch((error: unknown) => {
      ready = null;
      throw error;
    }));
  const q = async (text: string, params: unknown[] = []): Promise<Row[]> => {
    await ensure();
    return (await sql.query(text, params)) as Row[];
  };

  return {
    async taken(branch, date) {
      const rows = await q(`SELECT field_id, start_min, end_min FROM bookings WHERE branch = $1 AND date = $2 AND status <> 'cancelled'`, [branch, date]);
      return rows.map((r) => ({ fieldId: String(r.field_id), startMin: Number(r.start_min), endMin: Number(r.end_min) }));
    },
    async create(input) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const rows = await q(
            `INSERT INTO bookings (id, code, branch, field_id, date, start_min, end_min, status, name, phone, players, note, price_usd, source, telegram_user_id, telegram_username)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING ${COLUMNS}`,
            [randomUUID(), bookingCode(), input.branch, input.fieldId, input.date, input.startMin, input.endMin, input.status, input.name, input.phone, input.players, input.note, input.priceUsd, input.source, input.telegramUserId, input.telegramUsername],
          );
          return toBooking(rows[0] as Row);
        } catch (error) {
          if (isOverlap(error)) throw new SlotTakenError();
          // A booking code collision is astronomically rare; just draw another.
          if (isDuplicateCode(error) && attempt < 2) continue;
          throw error;
        }
      }
      throw new Error("unreachable");
    },
    async listDay(branch, date) {
      return (await q(`SELECT ${COLUMNS} FROM bookings WHERE branch = $1 AND date = $2 ORDER BY start_min, field_id`, [branch, date])).map(toBooking);
    },
    async listPending(fromDate) {
      return (await q(`SELECT ${COLUMNS} FROM bookings WHERE status = 'pending' AND date >= $1 ORDER BY date, start_min LIMIT 200`, [fromDate])).map(toBooking);
    },
    async get(id) {
      const rows = await q(`SELECT ${COLUMNS} FROM bookings WHERE id = $1`, [id]);
      return rows[0] ? toBooking(rows[0]) : null;
    },
    async setStatus(id, status) {
      try {
        const rows = await q(`UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`, [id, status]);
        return rows[0] ? toBooking(rows[0]) : null;
      } catch (error) {
        if (isOverlap(error)) throw new SlotTakenError();
        throw error;
      }
    },
    async ping() {
      await q(`SELECT 1`);
    },
  };
}

let store: BookingStore | null = null;

export function getStore(): BookingStore {
  if (store) return store;
  const url = process.env.DATABASE_URL;
  if (!url && process.env.VERCEL_ENV === "production") {
    // Never silently lose real bookings in memory.
    throw new Error("DATABASE_URL is not set");
  }
  store = url ? postgresStore(url) : memoryStore();
  return store;
}

export const isUuid = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
