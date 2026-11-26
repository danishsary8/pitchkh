import { describe, expect, it } from "vitest";
import { initialSelection, selectionReducer } from "./selection";

const fields = [
  { id: "f1", sport: "football" as const },
  { id: "t1", sport: "tennis" as const },
];
const picked = { ...initialSelection("2026-11-28"), start: 1080, fieldId: "f1" };

describe("selectionReducer", () => {
  it("starts on the given day with nothing picked", () => {
    expect(initialSelection("2026-11-28")).toEqual({ date: "2026-11-28", sport: null, duration: 60, start: null, fieldId: null });
  });
  it("clears the time when the day or length changes, keeps the pitch", () => {
    expect(selectionReducer(picked, { type: "date", date: "2026-11-29" })).toMatchObject({ start: null, fieldId: "f1" });
    expect(selectionReducer(picked, { type: "duration", duration: 120 })).toMatchObject({ start: null, duration: 120 });
  });
  it("returns the same state when nothing changes", () => {
    expect(selectionReducer(picked, { type: "date", date: "2026-11-28" })).toBe(picked);
  });
  it("toggles the start time", () => {
    expect(selectionReducer(picked, { type: "start", start: 1080 }).start).toBeNull();
    expect(selectionReducer(picked, { type: "start", start: 1200 }).start).toBe(1200);
  });
  it("drops the pitch only when the sport filter hides it", () => {
    expect(selectionReducer(picked, { type: "sport", sport: "tennis", fields }).fieldId).toBeNull();
    expect(selectionReducer(picked, { type: "sport", sport: "football", fields }).fieldId).toBe("f1");
    expect(selectionReducer(picked, { type: "sport", sport: null, fields }).fieldId).toBe("f1");
  });
  it("reset keeps day and length for the next booking", () => {
    expect(selectionReducer({ ...picked, duration: 120 }, { type: "reset" })).toMatchObject({ date: "2026-11-28", duration: 120, start: null, fieldId: null });
  });
});
