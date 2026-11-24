import { createApiClient, createMemoryStorage, type ApiMode, type StorageAdapter } from "@pitchkh/shared";

/** localStorage behind the async StorageAdapter interface (the mobile app passes AsyncStorage). */
function createWebStorage(): StorageAdapter {
  if (typeof window === "undefined") return createMemoryStorage();
  const safe = <T>(run: () => T, fallback: T): T => {
    try {
      return run();
    } catch {
      return fallback;
    }
  };
  return {
    getItem: (key) => Promise.resolve(safe(() => window.localStorage.getItem(key), null)),
    setItem: (key, value) => Promise.resolve(safe(() => window.localStorage.setItem(key, value), undefined)),
    removeItem: (key) => Promise.resolve(safe(() => window.localStorage.removeItem(key), undefined)),
  };
}

const apiMode: ApiMode = process.env.NEXT_PUBLIC_API_MODE === "real" ? "real" : "mock";

/** True when the app runs on the built-in mock API (the public demo). */
export const isDemo = apiMode === "mock";

/**
 * The single API client for the web app. This is the only place that reads
 * Next.js env vars: shared code receives plain config.
 */
export const api = createApiClient({
  apiMode,
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  storage: createWebStorage(),
  fetch: (url, init) => fetch(url, init),
});
