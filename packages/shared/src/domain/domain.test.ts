import { describe, expect, it } from "vitest";
import { createApiClient } from "../api/client";
import { ApiError } from "../api/errors";
import { createMemoryStorage } from "../mock/storage";
import type { Booking, Field, OpeningHours } from "../types";
import { calculatePrice, usdToKhr } from "./pricing";
import { canCancel } from "./rules";
import { findConflict, generateSlots, rangesOverlap, selectRange, validateRange } from "./slots";
import { addDays, dateInPP, timeInPP, toIso, weekdayOf } from "./time";

const field: Field = { id: "f1", venueId: "v1", sport: "football", name: "A", position: "", surface: "artificial_turf", indoor: false, format: "7v7", maxPlayers: 16, pricePerHourUsd: 20, peakPricePerHourUsd: 30, lit: true, status: "active", layout: null };
const hours: OpeningHours[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, open: "06:00", close: "23:00", closed: false }));
const booking = (start: string, end: string, status: Booking["status"] = "confirmed"): Booking =>
  ({ id: `b-${start}`, fieldId: "f1", startAt: toIso("2026-11-16", start), endAt: toIso("2026-11-16", end), status }) as Booking;
const now = new Date("2026-11-12T03:00:00Z"); // 10:00 in Phnom Penh

describe("time", () => {
  it("converts instants to Phnom Penh wall clock", () => {
    expect(dateInPP("2026-11-12T18:30:00Z")).toBe("2026-11-13");
    expect(timeInPP("2026-11-12T18:30:00Z")).toBe("01:30");
    expect(toIso("2026-11-12", "24:00")).toBe("2026-11-13T00:00:00+07:00");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayOf("2026-11-15")).toBe(0);
  });
});

describe("pricing", () => {
  it("splits off-peak and peak hours and adds extras and the service fee", () => {
    const price = calculatePrice({ field, date: "2026-11-16", startTime: "16:00", endTime: "18:00", referee: true, extras: { waterBottles: 6, ball: true, bibs: false } });
    // 1h off-peak (20) + 1h peak (30) + referee 2h (10) + water (3) + ball (2) = 65, fee 3% = 1.95
    expect(price.subtotalUsd).toBe(65);
    expect(price.serviceFeeUsd).toBe(1.95);
    expect(price.totalUsd).toBe(66.95);
    expect(price.totalKhr).toBe(usdToKhr(66.95));
    expect(price.totalKhr % 100).toBe(0);
  });
  it("adds the weekend surcharge on the field price only", () => {
    const price = calculatePrice({ field, date: "2026-11-15", startTime: "08:00", endTime: "09:00", referee: false, extras: { waterBottles: 0, ball: false, bibs: false } });
    expect(price.lines.find((l) => l.key === "weekend")?.amountUsd).toBe(2);
    expect(price.subtotalUsd).toBe(22);
  });
});

describe("slots and conflicts", () => {
  it("treats touching ranges as free and overlapping ranges as conflicts", () => {
    expect(rangesOverlap(0, 60, 60, 120)).toBe(false);
    expect(rangesOverlap(0, 61, 60, 120)).toBe(true);
    const bookings = [booking("18:00", "19:00")];
    const check = (start: string, end: string) => findConflict({ fieldId: "f1", startAt: toIso("2026-11-16", start), endAt: toIso("2026-11-16", end), bookings, blocks: [] });
    expect(check("19:00", "20:00")).toBeNull();
    expect(check("17:00", "18:00")).toBeNull();
    expect(check("18:30", "19:30")).toEqual({ kind: "booking", bookingId: "b-18:00" });
  });
  it("ignores cancelled bookings and respects blocks", () => {
    const blocks = [{ id: "k1", fieldId: "f1", date: "2026-11-16", startTime: "06:00", endTime: "08:00", reason: "" }];
    const grid = generateSlots({ field, openingHours: hours, date: "2026-11-16", bookings: [booking("18:00", "19:00", "cancelled"), booking("20:00", "21:00")], blocks, now });
    expect(grid.slots).toHaveLength(34);
    expect(grid.slots.find((s) => s.start === "06:30")?.status).toBe("blocked");
    expect(grid.slots.find((s) => s.start === "18:00")?.status).toBe("available");
    expect(grid.slots.find((s) => s.start === "20:30")?.status).toBe("booked");
    expect(validateRange(grid, "18:00", "19:30")).toBeNull();
    expect(validateRange(grid, "19:30", "20:30")).toBe("unavailable");
    expect(validateRange(grid, "18:00", "18:30")).toBe("too_short");
    expect(validateRange(grid, "22:00", "23:30")).toBe("outside_hours");
  });
  it("marks slots that already started as past", () => {
    const grid = generateSlots({ field, openingHours: hours, date: "2026-11-12", bookings: [], blocks: [], now });
    expect(grid.slots.find((s) => s.start === "09:30")?.status).toBe("past");
    expect(grid.slots.find((s) => s.start === "10:30")?.status).toBe("available");
  });
  it("extends a selection only across free slots", () => {
    const grid = generateSlots({ field, openingHours: hours, date: "2026-11-16", bookings: [booking("18:00", "19:00")], blocks: [], now });
    const index = (time: string) => grid.slots.findIndex((s) => s.start === time);
    expect(selectRange(grid.slots, index("16:00"), index("17:00"))).toEqual({ from: index("16:00"), to: index("17:00") });
    expect(selectRange(grid.slots, index("17:00"), index("19:30"))).toEqual({ from: index("19:30"), to: index("19:30") });
  });
});

describe("rules", () => {
  it("allows cancellation until two hours before the start", () => {
    expect(canCancel({ startAt: toIso("2026-11-12", "12:00"), status: "confirmed" }, now)).toBe(true);
    expect(canCancel({ startAt: toIso("2026-11-12", "11:30"), status: "confirmed" }, now)).toBe(false);
    expect(canCancel({ startAt: toIso("2026-11-14", "12:00"), status: "cancelled" }, now)).toBe(false);
  });
});

describe("api client on the mock server", () => {
  const make = () => createApiClient({ apiMode: "mock", apiUrl: "", storage: createMemoryStorage(), latency: [0, 0], now: () => now });

  it("lists venues with filters, pagination and sorting", async () => {
    const api = make();
    const all = await api.venues.list({ pageSize: 50 });
    expect(all.meta.total).toBe(14);
    const tennis = await api.venues.list({ sport: "tennis", sort: "price_asc" });
    expect(tennis.data.every((v) => v.sports.includes("tennis"))).toBe(true);
    expect(tennis.data[0]?.priceFromUsd).toBeLessThanOrEqual(tennis.data[1]?.priceFromUsd ?? 0);
  });

  it("creates, conflict-checks, reschedules and cancels a booking", async () => {
    const api = make();
    await expect(api.bookings.list()).rejects.toMatchObject({ status: 401 });
    await api.auth.login({ email: "dara@pitchkh.app", password: "password" });
    const venue = await api.venues.get("russey-keo-futsal");
    const target = venue.fields[0] as Field;
    const date = addDays(dateInPP(now), 12);
    const dto = { fieldId: target.id, date, startTime: "10:00", endTime: "11:30", teamSize: 5, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have" as const, paymentMethod: "khqr" as const };

    const created = await api.bookings.create(dto);
    expect(created.status).toBe("awaiting_payment");
    expect(created.price.totalUsd).toBe(15.45);
    // Online payment: the provider (sandbox) confirms it.
    const intent = await api.bookings.pay(created.id);
    expect(intent.qrPayload).toContain(created.code);
    const paid = await api.bookings.simulatePayment(intent.id);
    expect(paid.status).toBe("paid");
    expect(paid.bookingStatus).toBe("confirmed");

    const clash = await api.bookings.create({ ...dto, startTime: "11:00", endTime: "12:00" }).catch((e: unknown) => e);
    expect(clash).toBeInstanceOf(ApiError);
    expect((clash as ApiError).code).toBe("slot_unavailable");

    const moved = await api.bookings.reschedule(created.id, { date, startTime: "12:00", endTime: "13:00" });
    expect(moved.startAt).toBe(toIso(date, "12:00"));
    const cancelled = await api.bookings.cancel(created.id);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.paymentStatus).toBe("refunded");
    const again = await api.bookings.create(dto);
    expect(again.id).not.toBe(created.id);
  });

  it("releases an unpaid online booking when its payment hold runs out", async () => {
    let clock = now;
    const api = createApiClient({ apiMode: "mock", apiUrl: "", storage: createMemoryStorage(), latency: [0, 0], now: () => clock });
    await api.auth.login({ email: "dara@pitchkh.app", password: "password" });
    const venue = await api.venues.get("russey-keo-futsal");
    const target = venue.fields[1] as Field;
    const date = addDays(dateInPP(now), 11);
    const dto = { fieldId: target.id, date, startTime: "14:00", endTime: "15:00", teamSize: 5, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "have" as const, paymentMethod: "aba" as const };
    const held = await api.bookings.create(dto);
    await expect(api.bookings.create(dto)).rejects.toMatchObject({ code: "slot_unavailable" });
    const intent = await api.bookings.pay(held.id);
    clock = new Date(now.getTime() + 11 * 60_000);
    // The hold is gone: someone else can book, and the late payment can't go through.
    expect((await api.venues.availability(target.id, date)).slots.find((s) => s.start === "14:00")?.status).toBe("available");
    await expect(api.bookings.simulatePayment(intent.id)).rejects.toMatchObject({ code: "conflict" });
    expect((await api.bookings.create(dto)).status).toBe("awaiting_payment");
  });

  it("enforces roles", async () => {
    const api = make();
    await api.auth.login({ email: "dara@pitchkh.app", password: "password" });
    await expect(api.admin.analytics()).rejects.toMatchObject({ status: 403, code: "forbidden" });
    await expect(api.owner.venues()).rejects.toMatchObject({ status: 403 });
  });
});
