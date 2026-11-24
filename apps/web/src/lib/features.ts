import { notFound } from "next/navigation";

/**
 * Feature switches. Everything is on (the API serves it all since v1.1).
 * To hide a feature in a deployment, list it in NEXT_PUBLIC_FEATURES_OFF,
 * e.g. "chat" while you set up moderation.
 */
export const FEATURES = ["matches", "chat", "reviews"] as const;
export type Feature = (typeof FEATURES)[number];

const off = new Set((process.env.NEXT_PUBLIC_FEATURES_OFF ?? "").split(",").map((s) => s.trim()));

export const features: Record<Feature, boolean> = {
  matches: !off.has("matches"),
  chat: !off.has("chat"),
  reviews: !off.has("reviews"),
};

/** In a page: 404 when the feature is off, so old links don't land on a broken screen. */
export function requireFeature(feature: Feature): void {
  if (!features[feature]) notFound();
}
