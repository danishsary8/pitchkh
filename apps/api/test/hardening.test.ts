import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { Database } from "../src/db/client";
import { NOW, startTestApi } from "./harness";

// Rate limits are on in this file (the harness turns them off elsewhere).
let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi(NOW, undefined, { rateLimit: true });
});
afterAll(async () => {
  await api.stop();
});

const post = (path: string, body: unknown, ip: string, headers: Record<string, string> = {}) =>
  fetch(`${api.base}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers }, body: JSON.stringify(body) });
const errorCode = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

describe("rate limits", () => {
  it("stops password guessing on one account, without locking other accounts", async () => {
    for (let i = 0; i < 10; i++) expect((await post("/auth/login", { email: "dara@pitchkh.app", password: `guess${i}` }, "10.0.0.1")).status).toBe(401);
    const blocked = await post("/auth/login", { email: "dara@pitchkh.app", password: "password" }, "10.0.0.1");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await errorCode(blocked)).toBe("rate_limited");
    // Same address, another account: still allowed.
    expect((await post("/auth/login", { email: "sophea@pitchkh.app", password: "password" }, "10.0.0.1")).status).toBe(200);
  });

  it("limits sign-ups per address, and a faked X-Forwarded-For does not get around it", async () => {
    const register = (i: number, ip: string) => post("/auth/register", { name: `Spam ${i}`, email: `spam${i}-${ip}@example.com`, phone: "+855 12 000 000", password: "secret123", role: "player" }, ip);
    for (let i = 0; i < 10; i++) expect((await register(i, "10.0.0.2")).ok).toBe(true);
    expect((await register(10, "10.0.0.2")).status).toBe(429);
    // The proxy appends the real address last; a client-supplied first entry is ignored.
    expect((await register(11, "1.2.3.4, 10.0.0.2")).status).toBe(429);
    // Another address is fine.
    expect((await register(12, "10.0.0.3")).ok).toBe(true);
  });
});

describe("request hygiene", () => {
  it("tags every response with a request ID and security headers", async () => {
    const res = await fetch(`${api.base}/venues`);
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    // A well-formed incoming ID (e.g. from a proxy) is kept, so logs line up end to end.
    const traced = await fetch(`${api.base}/venues`, { headers: { "x-request-id": "trace-12345678" } });
    expect(traced.headers.get("x-request-id")).toBe("trace-12345678");
  });

  it("refuses oversized requests with 413", async () => {
    const res = await post("/auth/login", { email: "x@example.com", password: "a".repeat(7 * 1024 * 1024) }, "10.0.0.9");
    expect(res.status).toBe(413);
    expect(await errorCode(res)).toBe("payload_too_large");
  });
});

describe("health check", () => {
  it("is healthy when the database answers", async () => {
    const res = await fetch(api.base.replace(/\/api\/v1$/, "/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "up" });
  });

  it("answers 503 when the database does not", async () => {
    const broken = { execute: async () => { throw new Error("connection refused"); } } as unknown as Database;
    const app = createApp({ db: broken, clock: () => NOW, rateLimit: false, logRequests: false }, []);
    const res = await app.request("/health");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: "down" });
  });
});
