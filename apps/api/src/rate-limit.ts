/**
 * Rate limits for abuse-prone routes (password guessing, sign-up spam,
 * reset-email spam). Fixed-window counters kept in memory: right for one API
 * instance. Running several instances? Move the counters to Postgres or Redis
 * behind the same `hit` function.
 */
import { ApiError } from "@pitchkh/shared";
import type { Context, MiddlewareHandler } from "hono";
import { clientIp } from "./observability";

export interface RateRule {
  /** Shown in logs, and part of the counter key. */
  name: string;
  limit: number;
  windowMs: number;
  /** What to count by. Return null to skip this rule for the request. */
  key: (c: Context, body: Record<string, unknown> | null) => string | null;
}

export function createRateLimiter(now: () => number = Date.now) {
  const windows = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = now();
  return {
    /** Counts one hit. Returns seconds to wait when over the limit, else 0. */
    hit(key: string, limit: number, windowMs: number): number {
      const t = now();
      // Drop finished windows now and then, so memory stays bounded.
      if (t - lastSweep > 60_000) {
        for (const [k, w] of windows) if (w.resetAt <= t) windows.delete(k);
        lastSweep = t;
      }
      const w = windows.get(key);
      if (!w || w.resetAt <= t) {
        windows.set(key, { count: 1, resetAt: t + windowMs });
        return 0;
      }
      w.count += 1;
      return w.count > limit ? Math.ceil((w.resetAt - t) / 1000) : 0;
    },
  };
}
export type RateLimiter = ReturnType<typeof createRateLimiter>;

const MIN = 60_000;
const byIp = (c: Context): string => clientIp(c);
const byEmail = (_c: Context, body: Record<string, unknown> | null): string | null =>
  typeof body?.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;

/** The limits, per route. Generous for real people, tight for scripts. */
export const RATE_RULES: Record<string, RateRule[]> = {
  "POST /auth/login": [
    // Guessing one account's password, from anywhere.
    { name: "login-account", limit: 10, windowMs: 15 * MIN, key: byEmail },
    // Trying many accounts from one address.
    { name: "login-ip", limit: 30, windowMs: 15 * MIN, key: byIp },
  ],
  "POST /auth/register": [{ name: "register-ip", limit: 10, windowMs: 60 * MIN, key: byIp }],
  "POST /auth/forgot-password": [
    { name: "reset-email-account", limit: 3, windowMs: 60 * MIN, key: byEmail },
    { name: "reset-email-ip", limit: 10, windowMs: 60 * MIN, key: byIp },
  ],
  "POST /auth/reset-password": [{ name: "reset-ip", limit: 10, windowMs: 15 * MIN, key: byIp }],
  "POST /auth/refresh": [{ name: "refresh-ip", limit: 120, windowMs: 15 * MIN, key: byIp }],
};
/** Every API request, per address: stops floods without bothering real use (payment polling is ~30/min). */
export const GLOBAL_RULE: RateRule = { name: "api-ip", limit: 600, windowMs: MIN, key: byIp };

/** Hono middleware: applies the global rule, plus the route's own rules. */
export function rateLimit(limiter: RateLimiter, prefix: string): MiddlewareHandler {
  return async (c, next) => {
    const routeKey = `${c.req.method} ${c.req.path.slice(prefix.length)}`;
    const rules = [GLOBAL_RULE, ...(RATE_RULES[routeKey] ?? [])];
    // Only routes with per-account rules need the body (Hono caches it for the handler).
    let body: Record<string, unknown> | null = null;
    if (rules.some((r) => r.key === byEmail)) {
      try {
        body = JSON.parse((await c.req.text()) || "null") as Record<string, unknown> | null;
      } catch {
        body = null; // the route itself answers bad JSON with 422
      }
    }
    for (const rule of rules) {
      const key = rule.key(c, body);
      if (!key) continue;
      const wait = limiter.hit(`${rule.name}:${key}`, rule.limit, rule.windowMs);
      if (wait > 0) {
        c.header("Retry-After", String(wait));
        throw new ApiError(429, "rate_limited", `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`);
      }
    }
    await next();
  };
}
