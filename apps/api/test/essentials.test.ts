import { schemas } from "@pitchkh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NOW, startTestApi } from "./harness";

const outbox: { to: string; subject: string; text: string }[] = [];
let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi(NOW, undefined, { mailer: { send: async (to, subject, text) => void outbox.push({ to, subject, text }) } });
});
afterAll(async () => {
  await api.stop();
});

const waitFor = async (check: () => boolean) => {
  for (let i = 0; i < 50 && !check(); i++) await new Promise((r) => setTimeout(r, 20));
};
// A real 1x1 PNG.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("password reset", () => {
  it("emails a single-use link and signs in with the new password", async () => {
    const client = api.client();
    const old = await client.auth.login({ email: "dara@pitchkh.app", password: "password" });
    // Same answer for an unknown email (no account discovery), and no email sent.
    expect(await api.client().auth.forgotPassword("nobody@example.com")).toEqual({ sent: true });
    expect(await client.auth.forgotPassword("DARA@pitchkh.app")).toEqual({ sent: true });
    await waitFor(() => outbox.length > 0);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.to).toBe("dara@pitchkh.app");
    const token = /token=([\w-]+)/.exec(outbox[0]?.text ?? "")?.[1] as string;

    const session = await api.client().auth.resetPassword({ token, password: "new-secret-1" });
    expect(session.user.email).toBe("dara@pitchkh.app");
    await expect(api.client().auth.login({ email: "dara@pitchkh.app", password: "password" })).rejects.toMatchObject({ code: "invalid_credentials" });
    await api.client().auth.login({ email: "dara@pitchkh.app", password: "new-secret-1" });
    // The link works once, and old sessions are signed out.
    await expect(api.client().auth.resetPassword({ token, password: "another-1" })).rejects.toMatchObject({ code: "invalid_token" });
    const refresh = await fetch(`${api.base}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: old.refreshToken }) });
    expect(refresh.status).toBe(401);
  });
});

describe("venue photos", () => {
  it("uploads, serves, reorders and deletes photos, and refuses fake images", async () => {
    const owner = api.client();
    await owner.auth.login({ email: "sophea@pitchkh.app", password: "password" });
    const venue = await owner.venues.get("toul-kork-arena");
    const before = venue.photos;

    const updated = schemas.VenueDetail.parse(await owner.owner.uploadPhoto(venue.id, PNG));
    const url = updated.photos.at(-1) as string;
    expect(updated.photos).toHaveLength(before.length + 1);
    // Photo links use PUBLIC_URL; the test server runs on its own port.
    const local = (u: string) => new URL(new URL(u).pathname, api.base).toString();
    const served = await fetch(local(url));
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");

    // Text pretending to be a PNG is refused.
    await expect(owner.owner.uploadPhoto(venue.id, `data:image/png;base64,${Buffer.from("not an image").toString("base64")}`)).rejects.toMatchObject({ code: "validation_failed" });

    // Make it the cover, then delete it: the file goes too.
    expect((await owner.owner.setPhotos(venue.id, [url, ...before])).photos[0]).toBe(url);
    await owner.owner.setPhotos(venue.id, before);
    expect((await fetch(local(url))).status).toBe(404);
    // Only this venue's photos can be listed.
    await expect(owner.owner.setPhotos(venue.id, ["https://evil.example/x.png"])).rejects.toMatchObject({ code: "validation_failed" });
  });
});
