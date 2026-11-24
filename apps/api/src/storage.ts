/**
 * Where venue photos live. Local disk for development and single-server
 * hosting (served at /uploads/...). On hosts with a temporary disk, swap in an
 * S3-compatible store (Cloudflare R2, S3) behind the same two methods.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ApiError } from "@pitchkh/shared";

export interface PhotoStorage {
  /** Saves the image and returns its public URL. */
  save(bytes: Buffer, ext: "jpg" | "png" | "webp"): Promise<string>;
  /** Removes a photo it saved earlier (ignores URLs it doesn't own, like seed images). */
  remove(url: string): Promise<void>;
}

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
      if (/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) {
        try {
          unlinkSync(join(dir, name));
        } catch {
          // already gone
        }
      }
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
