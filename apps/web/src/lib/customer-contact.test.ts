import { describe, expect, it } from "vitest";
import { bestChatLink, callLink, chatLinks } from "./customer-contact";

const none = { telegramUsername: null, telegramUserId: null, phone: "" };

describe("chatLinks", () => {
  it("orders username, account, then phone", () => {
    expect(chatLinks({ telegramUsername: "dara_sok", telegramUserId: "1196520242", phone: "012 345 678" })).toEqual([
      { url: "https://t.me/dara_sok", via: "username" },
      { url: "tg://user?id=1196520242", via: "account" },
      { url: "https://t.me/+85512345678", via: "phone" },
    ]);
  });
  it("uses the Telegram account when there is no username", () => {
    expect(bestChatLink({ ...none, telegramUserId: "42", phone: "012345678" })).toEqual({ url: "tg://user?id=42", via: "account" });
  });
  it("falls back to the phone number for website bookings", () => {
    expect(bestChatLink({ ...none, phone: "+855 12 345 678" })).toEqual({ url: "https://t.me/+85512345678", via: "phone" });
  });
  it("never builds a link from malformed data", () => {
    expect(chatLinks({ telegramUsername: "a b/../x", telegramUserId: "12;drop", phone: "12" })).toEqual([]);
    expect(bestChatLink(none)).toBeNull();
  });
});

describe("callLink", () => {
  it("dials in international form", () => {
    expect(callLink("012 345 678")).toBe("tel:+85512345678");
    expect(callLink("")).toBeNull();
  });
});
