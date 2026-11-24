/**
 * A thin layer over Hono so each endpoint reads like its mock twin in
 * packages/shared/src/mock/handlers: route(method, path, access, handler).
 */
import { randomUUID } from "node:crypto";
import { ApiError, isoInPP, type NotificationType, type Role, type User } from "@pitchkh/shared";
import { eq } from "drizzle-orm";
import type { Context, Hono } from "hono";
import type { Database, Tx } from "./db/client";
import { toUser } from "./db/mappers";
import { notifications, users } from "./db/schema";
import { verifyAccessToken } from "./auth/tokens";

export interface Services {
  db: Database;
  /** Injectable clock so tests can freeze time. */
  clock: () => Date;
  /** Called after a notification row is written (e.g. Telegram alerts). Never throws into the request. */
  onNotify?: (n: { userId: string; type: NotificationType; params: Record<string, string>; href: string; meta?: Record<string, string> }) => void;
}

export interface Ctx {
  db: Database;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  user: User | null;
  now: Date;
  nowIso: string;
  requireUser(): User;
  newId(): string;
  /** A request header, e.g. Telegram's webhook secret. */
  header(name: string): string | undefined;
  /** Writes an in-app notification (inside the caller's transaction when given). */
  notify(tx: Tx, userId: string, type: NotificationType, params: Record<string, string>, href: string, meta?: Record<string, string>): Promise<void>;
  /** Run after the response is committed, e.g. outside notifications. */
  after(fn: () => void): void;
}

type Access = "public" | "auth" | readonly Role[];
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function readBody(c: Context): Promise<unknown> {
  if (c.req.method === "GET" || c.req.method === "DELETE") return undefined;
  const text = await c.req.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(422, "validation_failed", "The request body is not valid JSON.");
  }
}

async function authenticate(services: Services, c: Context, now: Date): Promise<User | null> {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const userId = await verifyAccessToken(header.slice(7), now);
  const [row] = await services.db.select().from(users).where(eq(users.id, userId));
  if (!row) throw new ApiError(401, "unauthorized", "Account no longer exists.");
  if (row.status === "suspended") throw new ApiError(403, "account_suspended", "This account is suspended.");
  return toUser(row);
}

export function createRouter(app: Hono, services: Services) {
  return function route(method: Method, path: string, access: Access, handler: (ctx: Ctx) => Promise<unknown> | unknown): void {
    app.on(method, path, async (c) => {
      const now = services.clock();
      const user = await authenticate(services, c, now);
      if (access !== "public") {
        if (!user) throw new ApiError(401, "unauthorized", "Sign in to continue.");
        if (access !== "auth" && !access.includes(user.role)) throw new ApiError(403, "forbidden", "You do not have access to this.");
      }
      const afterHooks: (() => void)[] = [];
      const ctx: Ctx = {
        db: services.db,
        params: c.req.param() as Record<string, string>,
        query: c.req.query(),
        body: await readBody(c),
        user,
        now,
        nowIso: isoInPP(now),
        requireUser: () => {
          if (!user) throw new ApiError(401, "unauthorized", "Sign in to continue.");
          return user;
        },
        newId: () => randomUUID(),
        header: (name) => c.req.header(name),
        notify: async (tx, userId, type, params, href, meta) => {
          await insertNotification(tx, now, userId, type, params, href);
          if (services.onNotify) afterHooks.push(() => services.onNotify?.({ userId, type, params, href, meta }));
        },
        after: (fn) => afterHooks.push(fn),
      };
      const result = await handler(ctx);
      for (const fn of afterHooks) {
        try {
          fn();
        } catch (e) {
          console.error("after-response hook failed", e);
        }
      }
      return result === undefined ? c.body(null, 204) : c.json(result as object);
    });
  };
}

export type Route = ReturnType<typeof createRouter>;

export async function insertNotification(tx: Tx, now: Date, userId: string, type: NotificationType, params: Record<string, string>, href: string): Promise<void> {
  await tx.insert(notifications).values({ id: randomUUID(), userId, type, params, href, read: false, createdAt: now });
}

/** Postgres error codes we turn into API errors. */
export function toApiErrorFromDb(e: unknown): ApiError | null {
  const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
  if (code === "23P01") return new ApiError(409, "slot_unavailable", "That time was just taken. Pick another slot.");
  if (code === "23505") return new ApiError(409, "conflict", "That already exists.");
  return null;
}
