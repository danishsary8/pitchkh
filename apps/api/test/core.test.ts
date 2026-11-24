import { addDays, ApiError, dateInPP, schemas, toIso, type Field } from "@pitchkh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NOW, startTestApi } from "./harness";

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.stop();
});

const dto = (field: Field, date: string, startTime = "10:00", endTime = "11:30") => ({
  fieldId: field.id, date, startTime, endTime, teamSize: 5, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have" as const, paymentMethod: "khqr" as const,
});

describe("auth", () => {
  it("signs in, refreshes with rotation, and rejects bad credentials", async () => {
    const client = api.client();
    const session = await client.auth.login({ email: "dara@pitchkh.app", password: "password" });
    expect(schemas.User.parse(session.user).email).toBe("dara@pitchkh.app");
    await expect(client.auth.login({ email: "dara@pitchkh.app", password: "wrong-password" })).rejects.toMatchObject({ status: 401, code: "invalid_credentials" });

    const refresh = (token: string) => fetch(`${api.base}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: token }) });
    const first = await refresh(session.refreshToken);
    expect(first.status).toBe(200);
    // A refresh token works once.
    expect((await refresh(session.refreshToken)).status).toBe(401);
  });

  it("registers a new player and blocks duplicate emails", async () => {
    const client = api.client();
    const session = await client.auth.register({ name: "Test Player", email: "new.player@example.com", phone: "+855 12 345 678", password: "secret123", role: "player" });
    expect(session.user.role).toBe("player");
    await expect(api.client().auth.register({ name: "Again", email: "NEW.player@example.com", phone: "+855 12 345 678", password: "secret123", role: "player" })).rejects.toMatchObject({ code: "email_taken" });
  });
});

describe("venues", () => {
  it("lists venues with filters, sorting, formats and next free times", async () => {
    const client = api.client();
    const all = await client.venues.list({ pageSize: 50 });
    expect(all.meta.total).toBe(14);
    for (const v of all.data) schemas.VenueSummary.parse(v);
    const tennis = await client.venues.list({ sport: "tennis", sort: "price_asc" });
    expect(tennis.data.every((v) => v.sports.includes("tennis"))).toBe(true);
    expect(tennis.data[0]?.priceFromUsd).toBeLessThanOrEqual(tennis.data[1]?.priceFromUsd ?? 0);
    const chbar = (await client.venues.list({ q: "Chbar Ampov" })).data[0];
    expect(chbar?.pitchFormats).toEqual([
      { sport: "football", format: "6v6", count: 3 },
      { sport: "football", format: "5v5", count: 3 },
      { sport: "football", format: "10v10", count: 1 },
    ]);
    expect(chbar?.nextFree?.date).toBe("2026-11-12");
  });

  it("returns a venue with its pitch layout and a day of availability", async () => {
    const client = api.client();
    const venue = schemas.VenueDetail.parse(await client.venues.get("chbar-ampov-football-city"));
    expect(venue.fields.find((f) => f.name === "Big Pitch")?.layout).toEqual({ x: 46, y: 4, w: 48, h: 75 });
    const day = schemas.VenueAvailability.parse(await client.venues.dayAvailability(venue.id, "2026-11-13"));
    expect(day.fields).toHaveLength(7);
    await expect(client.venues.get("no-such-venue")).rejects.toMatchObject({ status: 404 });
  });
});

describe("bookings", () => {
  it("creates, conflict-checks, reschedules and cancels a booking", async () => {
    const client = api.client();
    await expect(client.bookings.list()).rejects.toMatchObject({ status: 401 });
    await client.auth.login({ email: "dara@pitchkh.app", password: "password" });
    const venue = await client.venues.get("russey-keo-futsal");
    const field = venue.fields[0] as Field;
    const date = addDays(dateInPP(NOW), 12);

    const created = schemas.BookingDetail.parse(await client.bookings.create(dto(field, date)));
    expect(created.status).toBe("confirmed");
    expect(created.price.totalUsd).toBe(15.45);

    const clash = await client.bookings.create(dto(field, date, "11:00", "12:00")).catch((e: unknown) => e);
    expect(clash).toBeInstanceOf(ApiError);
    expect((clash as ApiError).code).toBe("slot_unavailable");

    const moved = await client.bookings.reschedule(created.id, { date, startTime: "12:00", endTime: "13:00" });
    expect(moved.startAt).toBe(toIso(date, "12:00"));
    const cancelled = await client.bookings.cancel(created.id);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.paymentStatus).toBe("refunded");
    const again = await client.bookings.create(dto(field, date));
    expect(again.id).not.toBe(created.id);

    // The owner (Russey Keo belongs to Piseth) was told.
    const owner = api.client();
    await owner.auth.login({ email: "piseth@pitchkh.app", password: "password" });
    const inbox = await owner.notifications.list();
    expect(inbox.some((n) => n.type === "booking_cancelled" && n.params.code === created.code)).toBe(true);
  });

  it("lets exactly one of many simultaneous bookings for one slot through", async () => {
    const venue = await api.client().venues.get("kampot-riverside-pitch");
    const field = venue.fields[0] as Field;
    const date = addDays(dateInPP(NOW), 9);
    const players = await Promise.all(Array.from({ length: 10 }, async (_, i) => {
      const c = api.client();
      await c.auth.register({ name: `Racer ${i}`, email: `racer${i}@example.com`, phone: "+855 12 000 000", password: "secret123", role: "player" });
      return c;
    }));
    const results = await Promise.allSettled(players.map((c) => c.bookings.create(dto(field, date, "18:00", "19:00"))));
    const ok = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(lost.every((r) => (r.reason as ApiError).code === "slot_unavailable")).toBe(true);
  });

  it("enforces who can see a booking", async () => {
    const player = api.client();
    await player.auth.login({ email: "dara@pitchkh.app", password: "password" });
    const mine = await player.bookings.list({ scope: "all", pageSize: 1 });
    const id = mine.data[0]?.id as string;
    const other = api.client();
    await other.auth.register({ name: "Stranger", email: "stranger@example.com", phone: "+855 12 111 111", password: "secret123", role: "player" });
    await expect(other.bookings.get(id)).rejects.toMatchObject({ status: 403 });
  });
});
