import { describe, expect, it } from "vitest";
import { nextStep, pitchAvailability, pitchesFor, timeOptions } from "./availability";
import { findBranch } from "./branches";

const NOW = new Date("2026-11-27T03:15:00Z"); // 10:15 in Phnom Penh
const branch = findBranch("sen-sok")!;
const all = branch.fields;
const [a, b] = all;
const taken = [{ fieldId: a!.id, startMin: 1080, endMin: 1200 }];

describe("pitchesFor", () => {
  it("filters by sport, or keeps all", () => {
    expect(pitchesFor(branch, null)).toHaveLength(all.length);
    expect(pitchesFor(branch, "tennis").every((f) => f.sport === "tennis")).toBe(true);
  });
});

describe("timeOptions", () => {
  it("drops blocks that already started today", () => {
    const today = timeOptions(branch, all, "2026-11-27", 120, [], NOW);
    expect(today[0]?.startMin).toBe(12 * 60);
  });
  it("counts free pitches per block", () => {
    const options = timeOptions(branch, all, "2026-11-28", 120, taken, NOW);
    expect(options.find((o) => o.startMin === 1080)?.freeCount).toBe(all.length - 1);
    expect(options.find((o) => o.startMin === 600)?.freeCount).toBe(all.length);
  });
});

describe("pitchAvailability", () => {
  const options = timeOptions(branch, all, "2026-11-28", 120, taken, NOW);
  it("follows the chosen block", () => {
    const states = pitchAvailability(all, taken, 1080, 120, options);
    expect(states[a!.id]).toBe("full");
    expect(states[b!.id]).toBe("free");
  });
  it("without a time, a pitch is free if any block is open", () => {
    expect(pitchAvailability(all, taken, null, 120, options)[a!.id]).toBe("free");
    expect(pitchAvailability(all, taken, null, 120, [])[a!.id]).toBe("full");
  });
});

describe("nextStep", () => {
  const states = { [a!.id]: "full", [b!.id]: "free" } as const;
  it.each([
    [null, null, "hintBoth"],
    [null, 1080, "hintPitch"],
    [a!.id, null, "hintTime"],
    [a!.id, 1080, "hintTaken"],
    [b!.id, 1080, null],
  ] as const)("field %s, start %s → %s", (field, start, step) => {
    expect(nextStep(field, start, states)).toBe(step);
  });
});
