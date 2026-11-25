/**
 * Request IDs and structured logs. Every response carries X-Request-Id, and
 * every request writes one JSON line, so a user's error can be found in the
 * logs from that ID.
 */
import { randomUUID } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";

type Level = "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

/** One JSON line per event, to stdout (info) or stderr (warn/error). Render shows both. */
export function log(level: Level, msg: string, fields: LogFields = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields });
  if (level === "info") console.log(line);
  else console.error(line);
}

// Per-request values, keyed by the request object (no global state across requests).
const requestIds = new WeakMap<Request, string>();
const requestUsers = new WeakMap<Request, string>();
export const requestIdOf = (c: Context): string | undefined => requestIds.get(c.req.raw);
/** Called by the router once the caller is known, so the request log can name them. */
export const setRequestUser = (c: Context, userId: string): void => void requestUsers.set(c.req.raw, userId);

/**
 * The caller's IP. Behind Render's proxy the real address is the LAST
 * X-Forwarded-For entry (earlier entries can be faked by the client).
 */
export function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  if (last) return last;
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress ?? "unknown";
}

const SAFE_ID = /^[A-Za-z0-9._-]{8,80}$/;

/** Gives each request an ID (reusing a well-formed incoming one) and logs it when done. */
export function requestLogger(options: { enabled: boolean }): MiddlewareHandler {
  return async (c, next) => {
    const incoming = c.req.header("x-request-id");
    const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    requestIds.set(c.req.raw, id);
    c.header("X-Request-Id", id);
    const started = performance.now();
    await next();
    // Health checks run every few seconds: logging them would bury everything else.
    if (!options.enabled || c.req.path === "/health") return;
    const status = c.res.status;
    log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "request", {
      requestId: id,
      method: c.req.method,
      path: c.req.path,
      status,
      ms: Math.round(performance.now() - started),
      userId: requestUsers.get(c.req.raw),
    });
  };
}
