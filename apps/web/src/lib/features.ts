import { notFound } from "next/navigation";

/**
 * Feature switches for things the real backend doesn't serve yet (v1.1).
 * Mock mode turns everything on, so demos keep showing the whole product.
 * Real mode turns on only what NEXT_PUBLIC_FEATURES lists, e.g. "matches,chat".
 */
export const FEATURES = ["matches", "chat", "reviews"] as const;
export type Feature = (typeof FEATURES)[number];

const real = process.env.NEXT_PUBLIC_API_MODE === "real";
const listed = new Set((process.env.NEXT_PUBLIC_FEATURES ?? "").split(",").map((s) => s.trim()));

export const features: Record<Feature, boolean> = {
  matches: !real || listed.has("matches"),
  chat: !real || listed.has("chat"),
  reviews: !real || listed.has("reviews"),
};

/** In a page: 404 when the feature is off, so old links don't land on a broken screen. */
export function requireFeature(feature: Feature): void {
  if (!features[feature]) notFound();
}
