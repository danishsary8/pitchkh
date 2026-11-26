import { addDays, dateInPP } from "@pitchkh/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInitData } from "@/test/telegram";

// Route handlers schedule bot messages with `after`, which needs a live request; run them inline.
vi.mock("next/server", async (load) => ({ ...(await load<typeof import("next/server")>()), after: (task: () => unknown) => void task() }));

const TOKEN = "123:TEST";
process.env.TELEGRAM_BOT_TOKEN = TOKEN;
process.env.ADMIN_TELEGRAM_IDS = "111";
// No bot messages leave the test run.
globalThis.fetch = vi.fn(async () => new Response("{}")) as typeof fetch;

const { POST: book } = await import("./bookings/route");
const { GET: taken } = await import("./branches/[slug]/taken/route");
const { GET: adminList, POST: adminCreate } = await import("./admin/bookings/route");
const { PATCH: setStatus } = await import("./admin/bookings/[id]/route");
const { GET: me } = await import("./admin/me/route");
const { GET: health } = await import("./health/route");

const tomorrow = addDays(dateInPP(new Date()), 1);
const staff = signInitData({ id: 111 }, TOKEN);
const stranger = signInitData({ id: 222, username: "dara" }, TOKEN);

const request = (path: string, init: { method?: string; body?: unknown; tg?: string; ip?: string } = {}): Request =>
  new Request(`http://test${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", "x-forwarded-for": init.ip ?? "10.0.0.1", ...(init.tg ? { "x-telegram-init-data": init.tg } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
const params = <T,>(value: T) => ({ params: Promise.resolve(value) });
const order = { branch: "sen-sok", fieldId: "sen-sok-f1", date: tomorrow, startMin: 18 * 60, duration: 90, name: "Sok Dara", phone: "012 345 678", players: 12, note: "" };

let ip = 0;
beforeEach(() => {
  (globalThis as { __pitchkhBookings?: Map<string, unknown> }).__pitchkhBookings?.clear();
  ip += 1; // a fresh address per test keeps the rate limiter out of the way
});
const post = (body: unknown, tg?: string) => book(request("/api/bookings", { method: "POST", body, tg, ip: `10.1.0.${ip}` }));

describe("customer booking", () => {
  it("creates a waiting booking with the server's price", async () => {
    const res = await post(order, stranger);
    expect(res.status).toBe(201);
    const { booking } = await res.json();
    expect(booking).toMatchObject({ status: "pending", startMin: 1080, endMin: 1170, priceUsd: 82.5 });
    expect(booking.code).toMatch(/^PK-/);
    // Personal details never come back in the public response.
    expect(booking).not.toHaveProperty("phone");
  });

  it("refuses a second booking that overlaps", async () => {
    await post(order);
    const res = await post({ ...order, startMin: 18 * 60 + 60 });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "slot_taken" });
  });

  it("explains invalid requests", async () => {
    expect((await post({ ...order, phone: "nope" })).status).toBe(400);
    expect(await (await post({ ...order, branch: "nowhere" })).json()).toEqual({ error: "unknown_branch" });
    expect(await (await post({ ...order, startMin: 21 * 60 + 30 })).json()).toEqual({ error: "outside_hours" });
  });

  it("rate-limits one address", async () => {
    const results = [];
    for (let i = 0; i < 12; i++) results.push((await book(request("/api/bookings", { method: "POST", body: { ...order, startMin: 360 + i * 90 }, ip: "10.9.9.9" }))).status);
    expect(results.at(-1)).toBe(429);
  });

  it("shows only when pitches are taken", async () => {
    await post(order, stranger);
    const res = await taken(request(`/api/branches/sen-sok/taken?date=${tomorrow}`), params({ slug: "sen-sok" }));
    expect(await res.json()).toEqual({ date: tomorrow, taken: [{ fieldId: "sen-sok-f1", startMin: 1080, endMin: 1170 }] });
    expect((await taken(request(`/api/branches/sen-sok/taken?date=2020-01-01`), params({ slug: "sen-sok" }))).status).toBe(400);
    expect((await taken(request(`/api/branches/nowhere/taken?date=${tomorrow}`), params({ slug: "nowhere" }))).status).toBe(404);
  });
});

describe("staff", () => {
  it("lets in only listed Telegram accounts", async () => {
    expect((await me(request("/api/admin/me"))).status).toBe(401);
    expect((await me(request("/api/admin/me", { tg: stranger }))).status).toBe(403);
    expect((await me(request("/api/admin/me", { tg: signInitData({ id: 111 }, "999:FORGED") }))).status).toBe(401);
    expect((await me(request("/api/admin/me", { tg: staff }))).status).toBe(200);
  });

  it("confirms, cancels and refuses to restore into a clash", async () => {
    await post(order, stranger);
    const list = await (await adminList(request(`/api/admin/bookings?branch=sen-sok&date=${tomorrow}`, { tg: staff }))).json();
    expect(list.pending).toHaveLength(1);
    const id = list.pending[0].id as string;
    expect(list.pending[0]).toMatchObject({ name: "Sok Dara", telegramUsername: "dara" });

    const patch = (status: string, tg = staff) => setStatus(request(`/api/admin/bookings/${id}`, { method: "PATCH", body: { status }, tg }), params({ id }));
    expect((await patch("confirmed", stranger)).status).toBe(403);
    expect((await (await patch("confirmed")).json()).booking.status).toBe("confirmed");
    expect((await (await patch("cancelled")).json()).booking.status).toBe("cancelled");
    await post({ ...order, duration: 60 });
    expect((await patch("confirmed")).status).toBe(409);
  });

  it("records walk-ins as confirmed, phone optional", async () => {
    const res = await adminCreate(request("/api/admin/bookings", { method: "POST", tg: staff, body: { ...order, name: "Walk-in", phone: "", players: 1, note: "" } }));
    expect(res.status).toBe(201);
    expect((await res.json()).booking).toMatchObject({ status: "confirmed", source: "admin" });
  });
});

describe("health", () => {
  it("reports the store and setup", async () => {
    expect(await (await health()).json()).toEqual({ ok: true, database: "memory", bot: true, admins: 1 });
  });
});
