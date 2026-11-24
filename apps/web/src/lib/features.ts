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

/**
 * One-tap demo sign-in on the login page. On by default with the mock API (it is a demo);
 * off with the real API unless NEXT_PUBLIC_DEMO_LOGIN=1, so production never shows
 * buttons that sign in with the shared demo password.
 */
export const demoLogin: boolean =
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "1" || (process.env.NEXT_PUBLIC_DEMO_LOGIN !== "0" && process.env.NEXT_PUBLIC_API_MODE !== "real");

/** In a page: 404 when the feature is off, so old links don't land on a broken screen. */
export function requireFeature(feature: Feature): void {
  if (!features[feature]) notFound();
}
