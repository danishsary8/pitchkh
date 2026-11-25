import { describe, expect, it } from "vitest";
import { createApiClient } from "../api/client";
import { ApiError } from "../api/errors";
import { createMemoryStorage } from "../mock/storage";
import type { Field } from "../types";
import { autoLayout, findLayoutOverlap, pitchSize, planBounds, resolveLayout, type FieldLayout } from "./layout";

const base: Field = { id: "", venueId: "v1", sport: "football", name: "", position: "", surface: "artificial_turf", indoor: false, format: "6v6", maxPlayers: 14, pricePerHourUsd: 20, peakPricePerHourUsd: 30, lit: true, status: "active", layout: null };
const field = (id: string, patch: Partial<Field> = {}): Field => ({ ...base, id, name: id, ...patch });

const noOverlaps = (map: Map<string, FieldLayout>): boolean => findLayoutOverlap([...map].map(([id, layout]) => ({ id, layout }))) === null;

describe("layout", () => {
  it("knows real pitch sizes by format", () => {
    expect(pitchSize("football", "6v6")).toEqual({ length: 36, width: 22 });
    expect(pitchSize("football", "10v10")).toEqual({ length: 75, width: 48 });
    expect(pitchSize("football", "11v11")).toEqual({ length: 100, width: 64 });
    expect(pitchSize("volleyball", "4v4")).toEqual({ length: 16, width: 8 });
    expect(pitchSize("tennis", "Singles/Doubles").width).toBeCloseTo(10.97);
  });

  it("auto-arranges pitches without overlaps, inside the plan", () => {
    const fields = [field("a"), field("b"), field("c"), field("big", { format: "10v10" }), field("t", { sport: "tennis", format: "Singles/Doubles" })];
    const map = autoLayout(fields);
    expect(map.size).toBe(5);
    expect(noOverlaps(map)).toBe(true);
    for (const l of map.values()) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.y).toBeGreaterThanOrEqual(0);
    }
    // Biggest pitch first: it opens the top row.
    expect(map.get("big")).toMatchObject({ y: 4, w: 75, h: 48 });
  });

  it("balances the plan: rows are centred and pitches sit in the middle of their row", () => {
    // BKK-like venue: a 7v7 and a 5v5 side by side, then two tennis courts.
    const fields = [field("seven", { format: "7v7" }), field("five", { format: "5v5" }), field("t1", { sport: "tennis", format: "Singles/Doubles" }), field("t2", { sport: "tennis", format: "Singles/Doubles" })];
    const map = autoLayout(fields);
    const { width } = planBounds(map.values());
    const seven = map.get("seven") as FieldLayout;
    const five = map.get("five") as FieldLayout;
    // The smaller pitch is vertically centred next to the bigger one.
    expect(five.y + five.h / 2).toBeCloseTo(seven.y + seven.h / 2);
    // The tennis row is centred under the football row: same margin left and right.
    const t1 = map.get("t1") as FieldLayout;
    const t2 = map.get("t2") as FieldLayout;
    const left = Math.min(t1.x, t2.x);
    const right = width - Math.max(t1.x + t1.w, t2.x + t2.w);
    expect(left).toBeCloseTo(right);
    expect(noOverlaps(map)).toBe(true);
  });

  it("keeps saved layouts and places the rest around them", () => {
    const saved: FieldLayout = { x: 10, y: 10, w: 22, h: 36 };
    const map = resolveLayout([field("a", { layout: saved }), field("b"), field("c")]);
    expect(map.get("a")).toEqual(saved);
    expect(map.size).toBe(3);
    expect(noOverlaps(map)).toBe(true);
  });

  it("finds overlapping pitches", () => {
    const a = { id: "a", layout: { x: 0, y: 0, w: 20, h: 10 } };
    expect(findLayoutOverlap([a, { id: "b", layout: { x: 19, y: 9, w: 5, h: 5 } }])).toEqual(["a", "b"]);
    expect(findLayoutOverlap([a, { id: "b", layout: { x: 24, y: 0, w: 5, h: 5 } }])).toBeNull();
    // Touching edges is fine.
    expect(findLayoutOverlap([a, { id: "b", layout: { x: 20, y: 0, w: 5, h: 5 } }])).toBeNull();
  });

  it("measures the plan with a margin", () => {
    expect(planBounds([{ x: 4, y: 4, w: 30, h: 18 }])).toEqual({ width: 38, height: 26 });
    expect(planBounds([])).toEqual({ width: 40, height: 24 });
  });
});

describe("layout api (mock)", () => {
  const now = new Date("2026-11-12T03:00:00Z");
  const make = () => createApiClient({ apiMode: "mock", apiUrl: "", storage: createMemoryStorage(), latency: [0, 0], now: () => now });

  it("seeds a plan for every venue and the showcase venue as drawn", async () => {
    const api = make();
    const venue = await api.venues.get("chbar-ampov-football-city");
    expect(venue.fields).toHaveLength(7);
    expect(venue.fields.find((f) => f.name === "Big Pitch")?.layout).toEqual({ x: 46, y: 4, w: 48, h: 75 });
    const other = await api.venues.get("toul-kork-arena");
    expect(other.fields.every((f) => f.layout !== null)).toBe(true);
    expect(noOverlaps(new Map(other.fields.map((f) => [f.id, f.layout as FieldLayout])))).toBe(true);
  });

  it("returns availability for every field of a venue in one call", async () => {
    const api = make();
    const venue = await api.venues.get("chbar-ampov-football-city");
    const day = await api.venues.dayAvailability(venue.id, "2026-11-13");
    expect(day.fields.map((f) => f.fieldId).sort()).toEqual(venue.fields.map((f) => f.id).sort());
    expect(day.fields[0]?.slots.length).toBeGreaterThan(0);
  });

  it("lets the owner save a plan and rejects overlaps", async () => {
    const api = make();
    await api.auth.login({ email: "sophea@pitchkh.app", password: "password" });
    const venue = await api.venues.get("chbar-ampov-football-city");
    const [a, b] = venue.fields as [Field, Field];
    const bad = await api.owner.saveLayout(venue.id, { items: [{ fieldId: a.id, layout: b.layout as FieldLayout }] }).catch((e: unknown) => e);
    expect(bad).toBeInstanceOf(ApiError);
    expect((bad as ApiError).code).toBe("validation_failed");
    const moved = { x: 150, y: 4, w: 36, h: 22 };
    const saved = await api.owner.saveLayout(venue.id, { items: [{ fieldId: a.id, layout: moved }] });
    expect(saved.fields.find((f) => f.id === a.id)?.layout).toEqual(moved);
    expect((await api.venues.get(venue.slug)).fields.find((f) => f.id === a.id)?.layout).toEqual(moved);
  });
});

describe("venue cards: formats and next free times", () => {
  const now = new Date("2026-11-12T03:00:00Z"); // 10:00 in Phnom Penh
  const make = () => createApiClient({ apiMode: "mock", apiUrl: "", storage: createMemoryStorage(), latency: [0, 0], now: () => now });

  it("groups pitches by format and offers the next free start times", async () => {
    const api = make();
    const list = await api.venues.list({ q: "Chbar Ampov" });
    const venue = list.data[0];
    expect(venue?.pitchFormats).toEqual([
      { sport: "football", format: "6v6", count: 3 },
      { sport: "football", format: "5v5", count: 3 },
      { sport: "football", format: "10v10", count: 1 },
    ]);
    expect(venue?.nextFree?.date).toBe("2026-11-12");
    expect(venue?.nextFree?.times).toHaveLength(3);
    // Never in the past, and sorted.
    for (const t of venue?.nextFree?.times ?? []) expect(t > "10:00").toBe(true);
    expect([...(venue?.nextFree?.times ?? [])].sort()).toEqual(venue?.nextFree?.times);
  });

  it("uses the list's date and from filter", async () => {
    const api = make();
    const list = await api.venues.list({ q: "Chbar Ampov", date: "2026-11-14", from: "18:00", to: "19:00" });
    expect(list.data[0]?.nextFree?.date).toBe("2026-11-14");
    expect(list.data[0]?.nextFree?.times[0] && list.data[0].nextFree.times[0] >= "18:00").toBe(true);
  });
});
