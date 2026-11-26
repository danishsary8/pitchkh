import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { inspectInitData, verifyInitData } from "./telegram";
import { signInitData } from "@/test/telegram";

const TOKEN = "123:TEST";
const NOW = 1_800_000_000_000;

describe("inspectInitData", () => {
  it("accepts data signed with the bot token", () => {
    const result = inspectInitData(signInitData({ id: 42, username: "dara" }, TOKEN, NOW / 1000), TOKEN, 3600, NOW);
    expect(result).toEqual({ ok: true, user: { id: "42", firstName: "Dara", lastName: null, username: "dara" } });
  });

  it("explains every rejection", () => {
    expect(inspectInitData("", TOKEN, 3600, NOW)).toMatchObject({ reason: "missing" });
    expect(inspectInitData("a=1", "", 3600, NOW)).toMatchObject({ reason: "no_token" });
    expect(inspectInitData("a=1&hash=zz", TOKEN, 3600, NOW)).toMatchObject({ reason: "malformed" });
    expect(inspectInitData(signInitData({ id: 42 }, "999:OTHER", NOW / 1000), TOKEN, 3600, NOW)).toMatchObject({ reason: "bad_signature" });
    expect(inspectInitData(signInitData({ id: 42 }, TOKEN, NOW / 1000 - 7200), TOKEN, 3600, NOW)).toMatchObject({ reason: "expired" });
  });

  it("rejects signed data without a user", () => {
    const params = new URLSearchParams({ auth_date: String(NOW / 1000) });
    const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).join("\n");
    params.set("hash", createHmac("sha256", createHmac("sha256", "WebAppData").update(TOKEN).digest()).update(check).digest("hex"));
    expect(inspectInitData(params.toString(), TOKEN, 3600, NOW)).toMatchObject({ reason: "no_user" });
  });

  it("detects tampering with any field", () => {
    const tampered = signInitData({ id: 42 }, TOKEN, NOW / 1000).replace("%22id%22%3A42", "%22id%22%3A43");
    expect(verifyInitData(tampered, TOKEN, 3600, NOW)).toBeNull();
  });
});
