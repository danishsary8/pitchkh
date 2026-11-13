import { STORAGE_KEYS, type StorageAdapter } from "../mock/storage";
import type { AuthSession, User } from "../types";

type Listener = (session: AuthSession | null) => void;

/**
 * Holds the signed-in session (tokens + user) in memory and mirrors it to the
 * injected storage, so it survives reloads on web and app restarts on mobile.
 */
export class SessionStore {
  private session: AuthSession | null = null;
  private hydrated: Promise<void> | null = null;
  private listeners = new Set<Listener>();

  constructor(private readonly storage: StorageAdapter) {}

  /** Loads the persisted session once. Safe to call many times. */
  hydrate(): Promise<void> {
    this.hydrated ??= this.storage
      .getItem(STORAGE_KEYS.session)
      .then((raw) => {
        if (!raw) return;
        // A light shape check is enough here (and keeps zod out of the startup
        // path): a tampered or stale token is rejected by the server anyway.
        const parsed = JSON.parse(raw) as Partial<AuthSession> | null;
        if (parsed && typeof parsed.accessToken === "string" && typeof parsed.refreshToken === "string" && typeof parsed.user?.id === "string") {
          this.session = parsed as AuthSession;
        }
      })
      .catch(() => undefined);
    return this.hydrated;
  }

  get(): AuthSession | null {
    return this.session;
  }

  async set(session: AuthSession | null): Promise<void> {
    this.session = session;
    for (const listener of this.listeners) listener(session);
    try {
      if (session) await this.storage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
      else await this.storage.removeItem(STORAGE_KEYS.session);
    } catch {
      // Storage unavailable: the session still works until the app closes.
    }
  }

  async updateUser(user: User): Promise<void> {
    if (this.session) await this.set({ ...this.session, user });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
