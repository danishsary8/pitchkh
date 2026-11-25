import { describe, expect, it } from "vitest";
import { telegramChatUrl, telegramShareUrl, toKhInternational } from "./telegram";

describe("toKhInternational", () => {
  it("keeps numbers that already have the +855 country code", () => {
    expect(toKhInternational("+855 23 210 300")).toBe("85523210300");
    expect(toKhInternational("855 12 345 678")).toBe("85512345678");
  });
  it("turns a local 0-prefixed number into +855", () => {
    expect(toKhInternational("012 345 678")).toBe("85512345678");
    expect(toKhInternational("(097) 123-4567")).toBe("855971234567");
  });
  it("rejects empty or too-short numbers", () => {
    expect(toKhInternational("")).toBeNull();
    expect(toKhInternational("12345")).toBeNull();
    expect(toKhInternational("+855")).toBeNull();
  });
});

describe("telegramChatUrl", () => {
  it("opens a chat by phone number", () => {
    expect(telegramChatUrl("+855 23 210 300")).toBe("https://t.me/+85523210300");
  });
  it("returns null when the phone cannot be used", () => {
    expect(telegramChatUrl("n/a")).toBeNull();
  });
});

describe("telegramShareUrl", () => {
  it("encodes the link and the message", () => {
    expect(telegramShareUrl("https://pitchkh.app/en/matches/1", "Need a team?\n7v7 & fun")).toBe(
      "https://t.me/share/url?url=https%3A%2F%2Fpitchkh.app%2Fen%2Fmatches%2F1&text=Need%20a%20team%3F%0A7v7%20%26%20fun",
    );
  });
});
