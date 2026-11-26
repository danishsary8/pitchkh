import { afterEach, describe, expect, it, vi } from "vitest";
import { rememberContact, rememberedContact, toBookingRequest } from "./contact";

const slot = { branch: "sen-sok", fieldId: "sen-sok-f1", date: "2026-11-28", startMin: 1080, duration: 60 };
const good = { name: "  Sok Dara ", phone: "012 345 678", players: "10", note: " bibs " };

describe("toBookingRequest", () => {
  it("builds the API body, trimmed and normalised", () => {
    expect(toBookingRequest(slot, good)).toEqual({ ok: true, request: { ...slot, name: "Sok Dara", phone: "012345678", players: 10, note: "bibs" } });
  });
  it("flags each contact field that needs fixing", () => {
    expect(toBookingRequest(slot, { ...good, name: " ", phone: "12", players: "" })).toEqual({ ok: false, errors: { name: true, phone: true, players: true } });
    expect(toBookingRequest(slot, { ...good, players: "41" })).toEqual({ ok: false, errors: { players: true } });
    expect(toBookingRequest(slot, { ...good, players: "2.5" })).toEqual({ ok: false, errors: { players: true } });
  });
});

describe("remembered contact", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  afterEach(() => store.clear());

  it("falls back to the Telegram name", () => {
    expect(rememberedContact({ first_name: "Dara", last_name: "Sok" })).toEqual({ name: "Dara Sok", phone: "" });
  });
  it("prefers what was used last time", () => {
    rememberContact({ name: "Vanna", phone: "012345678" });
    expect(rememberedContact({ first_name: "Dara" })).toEqual({ name: "Vanna", phone: "012345678" });
  });
  it("ignores damaged storage", () => {
    store.set("pitchkh-contact", "{not json");
    expect(rememberedContact()).toEqual({ name: "", phone: "" });
    store.set("pitchkh-contact", JSON.stringify({ name: 5, phone: null }));
    expect(rememberedContact()).toEqual({ name: "", phone: "" });
  });
});
