import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { r2Storage } from "../src/storage";
import { NOW, startTestApi } from "./harness";

// A 1x1 PNG.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// A fake R2 bucket: records every request and keeps the objects in memory.
const calls: { method: string; url: string; auth: string; type: string | null }[] = [];
const objects = new Map<string, Uint8Array>();
let failNextPut = false;
const storage = r2Storage({
  accountId: "acct123",
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
  bucket: "pitchkh-photos",
  publicUrl: "https://photos.test/",
  fetch: async (request) => {
    const path = new URL(request.url).pathname;
    calls.push({ method: request.method, url: request.url, auth: request.headers.get("authorization") ?? "", type: request.headers.get("content-type") });
    if (request.method === "PUT") {
      if (failNextPut) {
        failNextPut = false;
        return new Response("<Error>InternalError</Error>", { status: 500 });
      }
      objects.set(path, new Uint8Array(await request.arrayBuffer()));
      return new Response(null, { status: 200 });
    }
    objects.delete(path);
    return new Response(null, { status: 204 });
  },
});

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi(NOW, undefined, { storage });
});
afterAll(async () => {
  await api.stop();
});

async function owner() {
  const c = api.client();
  await c.auth.login({ email: "sophea@pitchkh.app", password: "password" });
  return { c, venue: await c.venues.get("toul-kork-arena") };
}

describe("venue photos on Cloudflare R2", () => {
  it("uploads a signed PUT to the bucket and returns the public URL", async () => {
    const { c, venue } = await owner();
    const updated = await c.owner.uploadPhoto(venue.id, PNG);
    const url = updated.photos.at(-1) as string;

    expect(url).toMatch(/^https:\/\/photos\.test\/venues\/[a-f0-9]{24}\.png$/);
    const put = calls.at(-1);
    expect(put?.method).toBe("PUT");
    expect(put?.url).toBe(`https://acct123.r2.cloudflarestorage.com/pitchkh-photos/venues/${url.split("/").pop()}`);
    expect(put?.type).toBe("image/png");
    // Signed with AWS Signature V4 for R2 ("auto" region, s3 service); the secret itself is never sent.
    expect(put?.auth).toMatch(/^AWS4-HMAC-SHA256 Credential=test-key\/\d{8}\/auto\/s3\/aws4_request/);
    expect(put?.auth).not.toContain("test-secret");
    // The bucket holds exactly the uploaded bytes.
    expect(Buffer.from(objects.get(`/pitchkh-photos/venues/${url.split("/").pop()}`) ?? [])).toEqual(Buffer.from(PNG.split(",")[1] as string, "base64"));
  });

  it("deletes only photos it uploaded when they are removed from the venue", async () => {
    const { c, venue } = await owner();
    const ours = venue.photos.filter((p) => p.startsWith("https://photos.test/"));
    const seed = venue.photos.filter((p) => !p.startsWith("https://photos.test/"));
    expect(ours).toHaveLength(1);
    calls.length = 0;

    await c.owner.setPhotos(venue.id, seed);
    // One DELETE for our photo; the seed images (not ours) are left alone.
    expect(calls.map((x) => x.method)).toEqual(["DELETE"]);
    expect(calls[0]?.url).toBe(`https://acct123.r2.cloudflarestorage.com/pitchkh-photos/venues/${(ours[0] as string).split("/").pop()}`);
    expect(objects.size).toBe(0);
  });

  it("never deletes a key it did not generate, even under its own URL", async () => {
    calls.length = 0;
    await storage.remove("https://photos.test/venues/../backups/db.sql");
    await storage.remove("https://photos.test/venues/cover.png");
    await storage.remove("https://elsewhere.example/venues/0123456789abcdef01234567.png");
    expect(calls).toEqual([]);
  });

  it("keeps the venue unchanged when R2 refuses the upload", async () => {
    const { c, venue } = await owner();
    failNextPut = true;
    await expect(c.owner.uploadPhoto(venue.id, PNG)).rejects.toMatchObject({ status: 500, code: "server_error" });
    expect((await c.venues.get("toul-kork-arena")).photos).toEqual(venue.photos);
  });
});
