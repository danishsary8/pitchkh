/**
 * Async key-value storage. Matches the shape of React Native's AsyncStorage,
 * so the mobile app can pass it directly; the web app wraps localStorage.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** In-memory adapter for tests, SSR and as a safe default. */
export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
  };
}

export const STORAGE_KEYS = {
  session: "pitchkh.session",
  mockDb: "pitchkh.mockdb",
} as const;
