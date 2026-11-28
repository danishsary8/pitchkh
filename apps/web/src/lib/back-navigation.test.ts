import { describe, expect, it } from "vitest";
import { parentOf } from "./back-navigation";

describe("parentOf", () => {
  it("has no back from home", () => {
    expect(parentOf("/")).toBeNull();
  });
  it.each(["/branch/sen-sok", "/admin", "/terms", "/privacy", "/credits", "/offline"])("%s goes back to home", (path) => {
    expect(parentOf(path)).toBe("/");
  });
});
