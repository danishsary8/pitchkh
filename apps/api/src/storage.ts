/**
 * Where venue photos live, behind two methods (save / remove):
 * - localStorage: local disk, served at /uploads/... (development, or a host with a persistent disk)
 * - r2Storage: Cloudflare R2 (S3-compatible), for hosts whose disk is wiped on redeploy.
 * Chosen by STORAGE=local|r2 (see env.ts and app.ts).
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ApiError } from "@pitchkh/shared";
import { AwsClient } from "aws4fetch";
import { log } from "./observability";

export interface PhotoStorage {
  /** Saves the image and returns its public URL. */
  save(bytes: Buffer, ext: "jpg" | "png" | "webp"): Promise<string>;
  /** Removes a photo it saved earlier (ignores URLs it doesn't own, like seed images). */
  remove(url: string): Promise<void>;
}

/** Names we generate: 24 random hex chars + extension. Anything else (seed images, foreign URLs) is never deleted. */
const OWN_NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

export function localStorage(dir: string, publicBaseUrl: string): PhotoStorage {
  mkdirSync(dir, { recursive: true });
  const prefix = `${publicBaseUrl.replace(/\/+$/, "")}/uploads/`;
  return {
    async save(bytes, ext) {
      const name = `${randomBytes(12).toString("hex")}.${ext}`;
      writeFileSync(join(dir, name), bytes);
      return prefix + name;
    },
    async remove(url) {
      if (!url.startsWith(prefix)) return;
      const name = url.slice(prefix.length);
      if (OWN_NAME.test(name)) {
        try {
          unlinkSync(join(dir, name));
        } catch {
          // already gone
        }
      }
    },
  };
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Where the bucket is served to browsers: the r2.dev URL or a custom domain, e.g. https://photos.pitchkh.app */
  publicUrl: string;
  /** Tests point this at a fake server. Default: https://<accountId>.r2.cloudflarestorage.com */
  endpoint?: string;
  /** Tests swap in a fake; production uses the global fetch. */
  fetch?: (request: Request) => Promise<Response>;
}

const CONTENT_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/**
 * Cloudflare R2 (any S3-compatible store works). Photos survive redeploys, unlike a
 * free host's disk. Each request is signed with AWS Signature V4 by aws4fetch.
 */
export function r2Storage(config: R2Config): PhotoStorage {
  const aws = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: "s3", region: "auto" });
  const send = config.fetch ?? ((request: Request) => fetch(request));
  const endpoint = (config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, "");
  const prefix = `${config.publicUrl.replace(/\/+$/, "")}/venues/`;
  const call = async (method: "PUT" | "DELETE", name: string, init: RequestInit = {}): Promise<Response> =>
    send(await aws.sign(`${endpoint}/${config.bucket}/venues/${name}`, { ...init, method }));
  return {
    async save(bytes, ext) {
      const name = `${randomBytes(12).toString("hex")}.${ext}`;
      const res = await call("PUT", name, { body: new Uint8Array(bytes), headers: { "content-type": CONTENT_TYPES[ext], "cache-control": "public, max-age=31536000, immutable" } });
      // Logged with the status (never the keys); the owner sees a normal "something went wrong".
      if (!res.ok) throw new Error(`R2 upload failed: HTTP ${res.status}`);
      return prefix + name;
    },
    async remove(url) {
      if (!url.startsWith(prefix)) return;
      const name = url.slice(prefix.length);
      if (!OWN_NAME.test(name)) return;
      // The photo is already gone from the venue; a leftover file must not fail the request.
      const res = await call("DELETE", name).catch((e: unknown) => e);
      if (!(res instanceof Response) || (!res.ok && res.status !== 404)) log("error", "R2 delete failed", { name, status: res instanceof Response ? res.status : undefined, error: res instanceof Response ? undefined : String(res) });
    },
  };
}

const MAX_BYTES = 4 * 1024 * 1024;

/** Decodes a data URL and checks the bytes really are a JPEG, PNG or WebP (not just the label). */
export function decodeImage(dataUrl: string): { bytes: Buffer; ext: "jpg" | "png" | "webp" } {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  if (bytes.length > MAX_BYTES) throw new ApiError(422, "validation_failed", "Photos can be up to 4 MB.", { dataUrl: ["Too large"] });
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { bytes, ext: "jpg" };
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { bytes, ext: "png" };
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return { bytes, ext: "webp" };
  throw new ApiError(422, "validation_failed", "That file is not a JPEG, PNG or WebP image.", { dataUrl: ["Not an image"] });
}
