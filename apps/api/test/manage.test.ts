import { addDays, ApiError, dateInPP, schemas, type Field, type FieldLayout } from "@pitchkh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NOW, startTestApi } from "./harness";

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.stop();
});

const login = async (email: string) => {
  const c = api.client();
  await c.auth.login({ email, password: "password" });
  return c;
};

describe("roles", () => {
  it("keeps players out of owner and admin endpoints", async () => {
    const player = await login("dara@pitchkh.app");
    await expect(player.admin.analytics()).rejects.toMatchObject({ status: 403, code: "forbidden" });
    await expect(player.owner.venues()).rejects.toMatchObject({ status: 403 });
    await expect(api.client().owner.venues()).rejects.toMatchObject({ status: 401 });
  });

  it("only shows an owner their own venues", async () => {
    const piseth = await login("piseth@pitchkh.app");
    const sophea = await login("sophea@pitchkh.app");
    const theirs = (await piseth.owner.venues())[0];
    expect(theirs).toBeDefined();
    await expect(sophea.owner.updateVenue(theirs?.id as string, { ...theirs, name: "Taken over" } as never)).rejects.toMatchObject({ status: 404 });
  });
});

describe("owner", () => {
  it("saves a pitch map and rejects overlaps", async () => {
    const owner = await login("sophea@pitchkh.app");
    const venue = await owner.venues.get("chbar-ampov-football-city");
    const [a, b] = venue.fields as [Field, Field];
    const bad = await owner.owner.saveLayout(venue.id, { items: [{ fieldId: a.id, layout: b.layout as FieldLayout }] }).catch((e: unknown) => e);
    expect((bad as ApiError).code).toBe("validation_failed");
    const moved = { x: 150, y: 4, w: 36, h: 22 };
    const saved = await owner.owner.saveLayout(venue.id, { items: [{ fieldId: a.id, layout: moved }] });
    expect(saved.fields.find((f) => f.id === a.id)?.layout).toEqual(moved);
    expect((await api.client().venues.get(venue.slug)).fields.find((f) => f.id === a.id)?.layout).toEqual(moved);
  });

  it("answers a cash request, and the player is told", async () => {
    const player = await login("dara@pitchkh.app");
    const venue = await player.venues.get("toul-kork-arena");
    const field = venue.fields.find((f) => f.sport === "football") as Field;
    const date = addDays(dateInPP(NOW), 15);
    const booking = await player.bookings.create({ fieldId: field.id, date, startTime: "08:00", endTime: "09:00", teamSize: 6, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have", paymentMethod: "cash" });
    expect(booking.status).toBe("pending");
    const owner = await login("sophea@pitchkh.app");
    const decided = await owner.owner.decideBooking(booking.id, "accept");
    expect(decided.status).toBe("confirmed");
    await expect(owner.owner.decideBooking(booking.id, "reject")).rejects.toMatchObject({ code: "conflict" });
    expect((await player.notifications.list()).some((n) => n.type === "booking_confirmed" && n.params.code === booking.code)).toBe(true);
  });

  it("shows the schedule, blocks time and refuses blocks over bookings", async () => {
    const owner = await login("sophea@pitchkh.app");
    const venue = await owner.venues.get("toul-kork-arena");
    const field = venue.fields[0] as Field;
    const date = addDays(dateInPP(NOW), 20);
    const block = await owner.owner.createBlock({ fieldId: field.id, date, startTime: "06:00", endTime: "08:00", reason: "Re-lining" });
    const schedule = await owner.owner.schedule(venue.id, date);
    expect(schedule.blocks.map((b) => b.id)).toContain(block.id);
    const day = await api.client().venues.availability(field.id, date);
    expect(day.slots.find((s) => s.start === "06:30")?.status).toBe("blocked");
    await owner.owner.deleteBlock(block.id);
    expect((await owner.owner.schedule(venue.id, date)).blocks.map((b) => b.id)).not.toContain(block.id);
  });

  it("creates a venue and a pitch, and reports earnings in the contract shape", async () => {
    const owner = await login("sophea@pitchkh.app");
    const base = await owner.venues.get("toul-kork-arena");
    const created = await owner.owner.createVenue({ name: "Test Arena", nameKm: "", description: "A test venue for the API.", descriptionKm: "", province: "phnom_penh", district: "Toul Kork", address: "St 1", lat: 11.57, lng: 104.9, phone: "+855 12 345 678", amenities: ["parking"], openingHours: base.openingHours });
    expect(created.status).toBe("pending");
    const field = await owner.owner.createField(created.id, { sport: "volleyball", name: "Court A", position: "", surface: "sand", indoor: false, format: "4v4", maxPlayers: 10, pricePerHourUsd: 8, peakPricePerHourUsd: 10, lit: true, status: "active" });
    expect(field.layout).toBeNull();
    expect((await owner.venues.get(created.id)).sports).toEqual(["volleyball"]);
    await owner.owner.deleteField(field.id);
    schemas.OwnerEarnings.parse(await owner.owner.earnings());
  });
});

describe("admin", () => {
  it("moderates venues, suspends users and resolves reports", async () => {
    const admin = await login("admin@pitchkh.app");
    schemas.AdminAnalytics.parse(await admin.admin.analytics());
    const pending = await admin.admin.venues({ status: "pending" });
    const target = pending.data[0];
    expect(target).toBeDefined();
    const approved = await admin.admin.moderateVenue(target?.id as string, { status: "approved" });
    expect(approved.verified).toBe(true);

    const users = await admin.admin.users({ q: "dara" });
    const dara = users.data[0];
    await admin.admin.setUserStatus(dara?.id as string, "suspended");
    await expect(login("dara@pitchkh.app")).rejects.toMatchObject({ code: "account_suspended" });
    await admin.admin.setUserStatus(dara?.id as string, "active");

    const reports = await admin.admin.reports({ status: "open" });
    if (reports.data[0]) {
      const resolved = await admin.admin.resolveReport(reports.data[0].id, { status: "resolved", resolution: "Fixed" });
      expect(resolved.status).toBe("resolved");
    }
  });
});
