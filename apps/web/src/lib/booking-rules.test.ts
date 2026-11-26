import { describe, expect, it } from "vitest";
import {
  BookingRequest,
  blockStarts,
  bookableDates,
  bookingCode,
  BOOKING_DAYS,
  checkRules,
  isFieldFree,
  isPast,
  openState,
  overlaps,
  priceFor,
  startTimes,
} from "./booking-rules";
import { BRANCHES, findBranch } from "./branches";

/** 2026-11-27 10:15 in Phnom Penh (UTC+7). */
const NOW = new Date("2026-11-27T03:15:00Z");
const branch = findBranch("sen-sok")!;
const fieldA = branch.fields.find((f) => f.name === "Field A")!;

describe("overlaps", () => {
  it("treats touching games as not overlapping", () => {
    expect(overlaps({ startMin: 600, endMin: 660 }, { startMin: 660, endMin: 720 })).toBe(false);
  });
  it("catches any shared minute", () => {
    expect(overlaps({ startMin: 600, endMin: 690 }, { startMin: 660, endMin: 720 })).toBe(true);
    expect(overlaps({ startMin: 600, endMin: 720 }, { startMin: 630, endMin: 660 })).toBe(true);
  });
});

describe("priceFor", () => {
  it("charges the day rate before 17:00", () => {
    expect(priceFor(fieldA, 600, 720)).toBe(80);
  });
  it("charges the peak rate per half hour that falls in the evening", () => {
    // 16:30–17:30: half an hour at $40/h, half an hour at $55/h.
    expect(priceFor(fieldA, 990, 1050)).toBe(47.5);
  });
});

describe("time choices", () => {
  it("startTimes leaves room for the whole game before closing", () => {
    const times = startTimes(branch, 120);
    expect(times[0]).toBe(6 * 60);
    expect(times.at(-1)).toBe(22 * 60 - 120);
  });
  it("blockStarts steps by the chosen length from opening time", () => {
    expect(blockStarts(branch, 120).slice(0, 3)).toEqual([360, 480, 600]);
    expect(blockStarts(branch, 90).slice(0, 3)).toEqual([360, 450, 540]);
  });
});

describe("dates and the past", () => {
  it("offers BOOKING_DAYS days starting today in Phnom Penh", () => {
    const days = bookableDates(NOW);
    expect(days).toHaveLength(BOOKING_DAYS);
    expect(days[0]).toBe("2026-11-27");
  });
  it("knows what has already started", () => {
    expect(isPast("2026-11-27", 600, NOW)).toBe(true);
    expect(isPast("2026-11-27", 660, NOW)).toBe(false);
    expect(isPast("2026-11-28", 360, NOW)).toBe(false);
    expect(isPast("2026-11-26", 1200, NOW)).toBe(true);
  });
  it("gives staff a grace period for walk-ins", () => {
    expect(isPast("2026-11-27", 600, NOW, 120)).toBe(false);
  });
});

describe("isFieldFree", () => {
  const taken = [{ fieldId: fieldA.id, startMin: 1080, endMin: 1200 }];
  it("blocks overlapping times on the same pitch only", () => {
    expect(isFieldFree(taken, fieldA.id, 1140, 1260)).toBe(false);
    expect(isFieldFree(taken, "other", 1140, 1260)).toBe(true);
    expect(isFieldFree(taken, fieldA.id, 1200, 1260)).toBe(true);
  });
});

describe("checkRules", () => {
  const base = { fieldId: fieldA.id, date: "2026-11-28", startMin: 1080, duration: 120 };
  it("accepts a normal request", () => {
    expect(checkRules(branch, base, NOW)).toBeNull();
  });
  it.each([
    [{ fieldId: "bkk-f1" }, "unknown_field"],
    [{ date: "2027-03-01" }, "bad_date"],
    [{ startMin: 1095 }, "not_aligned"],
    [{ startMin: 330 }, "outside_hours"],
    [{ startMin: 1260, duration: 120 }, "outside_hours"],
    [{ date: "2026-11-27", startMin: 540 }, "past"],
  ] as const)("rejects %o with %s", (change, error) => {
    expect(checkRules(branch, { ...base, ...change }, NOW)).toBe(error);
  });
});

describe("BookingRequest", () => {
  const valid = { branch: "sen-sok", fieldId: fieldA.id, date: "2026-11-28", startMin: 1080, duration: 120, name: " Dara ", phone: "012 345-678", players: 10 };
  it("normalises name and phone", () => {
    const parsed = BookingRequest.parse(valid);
    expect(parsed.name).toBe("Dara");
    expect(parsed.phone).toBe("012345678");
    expect(parsed.note).toBe("");
  });
  it.each([{ phone: "abc" }, { duration: 45 }, { players: 0 }, { name: "" }, { note: "x".repeat(301) }])("rejects %o", (change) => {
    expect(BookingRequest.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

describe("bookingCode", () => {
  it("never uses look-alike characters", () => {
    for (let i = 0; i < 200; i++) expect(bookingCode()).toMatch(/^PK-[2-9A-HJ-NP-Z]{5}$/);
  });
});

describe("branches", () => {
  it("has unique pitch ids and slugs", () => {
    const ids = BRANCHES.flatMap((b) => b.fields.map((f) => f.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(BRANCHES.map((b) => b.slug)).size).toBe(BRANCHES.length);
  });
});

describe("openState", () => {
  it("is open between opening and closing time", () => {
    expect(openState(branch, NOW)).toEqual({ open: true, until: "22:00" });
  });
  it("is closed after closing, with the next opening time", () => {
    expect(openState(branch, new Date("2026-11-27T15:30:00Z"))).toEqual({ open: false, opensAt: "06:00" }); // 22:30
    expect(openState(branch, new Date("2026-11-26T22:59:00Z"))).toEqual({ open: false, opensAt: "06:00" }); // 05:59
  });
});
