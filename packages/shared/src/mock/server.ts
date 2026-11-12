import type { z } from "zod";
import { ApiError } from "../api/errors";
import type { ApiRequest, HttpMethod } from "../api/transport";
import { uuid } from "../domain/ids";
import { isoInPP } from "../domain/time";
import type { Notification, NotificationType, Paginated, Role, User } from "../types";
import { loadDb, saveDb, type MockDb } from "./db";
import type { StorageAdapter } from "./storage";
import { seedDb } from "./seed";

export interface MockContext {
  db: MockDb;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  /** The signed-in user, or null for anonymous requests. */
  user: User | null;
  now: Date;
  /** Current time as ISO-8601 (+07:00). */
  nowIso: string;
  /** Throws 401 when signed out. */
  requireUser(): User;
  newId(): string;
  notify(userId: string, type: NotificationType, params: Record<string, string>, href: string): void;
}

type Access = "public" | "auth" | readonly Role[];
type Handler = (ctx: MockContext) => unknown;
interface Route {
  method: HttpMethod;
  segments: string[];
  access: Access;
  handler: Handler;
}

const ACCESS_TTL_MS = 60 * 60_000;

export const makeAccessToken = (userId: string, now: Date): string => `mock-access.${userId}.${now.getTime() + ACCESS_TTL_MS}`;
export const makeRefreshToken = (userId: string): string => `mock-refresh.${userId}`;
export const accessExpiry = (now: Date): string => isoInPP(new Date(now.getTime() + ACCESS_TTL_MS));

/** Validates input like a backend would: 422 with per-field messages. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value ?? {});
  if (result.success) return result.data;
  const details: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    (details[key] ??= []).push(issue.message);
  }
  throw new ApiError(422, "validation_failed", "Some fields are invalid.", details);
}

export function notFound(what: string): ApiError {
  return new ApiError(404, "not_found", `${what} not found.`);
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Paginated<T> {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

/**
 * An in-memory backend that implements docs/API_CONTRACT.md route for route.
 * Api services talk to it through the same Transport they use for real HTTP,
 * so swapping to a real backend changes no service or UI code.
 */
export class MockServer {
  private routes: Route[] = [];
  private db: MockDb | null = null;
  private loading: Promise<MockDb> | null = null;

  constructor(
    private readonly storage: StorageAdapter,
    private readonly clock: () => Date,
  ) {}

  route(method: HttpMethod, path: string, access: Access, handler: Handler): this {
    this.routes.push({ method, segments: path.split("/").filter(Boolean), access, handler });
    return this;
  }

  private async getDb(): Promise<MockDb> {
    if (this.db) return this.db;
    this.loading ??= loadDb(this.storage, this.clock());
    this.db = await this.loading;
    this.loading = null;
    return this.db;
  }

  /** Wipes all demo data back to a fresh seed. */
  async reset(): Promise<void> {
    this.db = seedDb(this.clock());
    await saveDb(this.storage, this.db);
  }

  private match(method: HttpMethod, path: string): { route: Route; params: Record<string, string> } | null {
    const parts = path.split("/").filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      const ok = route.segments.every((segment, i) => {
        const part = parts[i] ?? "";
        if (segment.startsWith(":")) {
          params[segment.slice(1)] = decodeURIComponent(part);
          return true;
        }
        return segment === part;
      });
      if (ok) return { route, params };
    }
    return null;
  }

  private authenticate(db: MockDb, token: string | null, now: Date): User | null {
    if (!token) return null;
    const [kind, userId, expires] = token.split(".");
    if (kind !== "mock-access" || !userId) throw new ApiError(401, "unauthorized", "Invalid access token.");
    if (Number(expires) <= now.getTime()) throw new ApiError(401, "token_expired", "Access token expired.");
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new ApiError(401, "unauthorized", "Account no longer exists.");
    if (user.status === "suspended") throw new ApiError(403, "account_suspended", "This account is suspended.");
    return user;
  }

  async handle<T>(request: ApiRequest, token: string | null): Promise<T> {
    const db = await this.getDb();
    const now = this.clock();
    const found = this.match(request.method, request.path);
    if (!found) throw new ApiError(404, "not_found", `No route for ${request.method} ${request.path}`);

    const user = request.anonymous ? null : this.authenticate(db, token, now);
    const { access } = found.route;
    if (access !== "public") {
      if (!user) throw new ApiError(401, "unauthorized", "Sign in to continue.");
      if (access !== "auth" && !access.includes(user.role)) throw new ApiError(403, "forbidden", "You do not have access to this.");
    }

    const ctx: MockContext = {
      db,
      params: found.params,
      query: (request.query ?? {}) as Record<string, unknown>,
      body: request.body,
      user,
      now,
      nowIso: isoInPP(now),
      requireUser: () => {
        if (!user) throw new ApiError(401, "unauthorized", "Sign in to continue.");
        return user;
      },
      newId: () => uuid(),
      notify: (userId, type, params, href) => {
        const n: Notification = { id: uuid(), userId, type, params, href, read: false, createdAt: isoInPP(now) };
        db.notifications.unshift(n);
      },
    };

    const result = found.route.handler(ctx);
    if (request.method !== "GET") await saveDb(this.storage, db);
    // Clone so callers can never mutate the "database" by reference.
    return (result === undefined ? undefined : JSON.parse(JSON.stringify(result))) as T;
  }
}
