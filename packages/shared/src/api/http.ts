import type { FetchLike } from "../config";
import type { AuthSession } from "../types";
import { ApiError, toApiError } from "./errors";
import type { SessionStore } from "./session";
import { buildQuery, type ApiRequest, type Transport } from "./transport";

/**
 * "real" mode transport: JSON over HTTP with a Bearer access token.
 * Unused while apiMode = "mock", but complete so the switch is config-only.
 */
export function createHttpTransport(baseUrl: string, fetchImpl: FetchLike, session: SessionStore): Transport {
  const root = baseUrl.replace(/\/+$/, "");
  return async <T>(request: ApiRequest): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (request.body !== undefined) headers["Content-Type"] = "application/json";
    const token = request.anonymous ? null : (session.get()?.accessToken ?? null);
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetchImpl(`${root}${request.path}${buildQuery(request.query)}`, {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
    } catch {
      throw new ApiError(0, "network_error", "Cannot reach the server. Check your connection.");
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    let body: unknown = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      if (response.ok) throw new ApiError(response.status, "server_error", "The server sent an invalid response.");
    }
    if (!response.ok) throw toApiError(response.status, body);
    return body as T;
  };
}

/**
 * Token refresh hook, shared by both transports. When a request fails because
 * the access token expired, it exchanges the refresh token once (de-duplicated
 * across concurrent requests) and replays the original request.
 */
export function withTokenRefresh(transport: Transport, session: SessionStore, onSessionExpired?: () => void): Transport {
  let refreshing: Promise<AuthSession | null> | null = null;

  const refresh = (): Promise<AuthSession | null> => {
    refreshing ??= (async () => {
      const current = session.get();
      if (!current) return null;
      try {
        const next = await transport<AuthSession>({ method: "POST", path: "/auth/refresh", body: { refreshToken: current.refreshToken }, anonymous: true });
        await session.set(next);
        return next;
      } catch {
        await session.set(null);
        onSessionExpired?.();
        return null;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };

  return async <T>(request: ApiRequest): Promise<T> => {
    await session.hydrate();
    try {
      return await transport<T>(request);
    } catch (error) {
      const expired = error instanceof ApiError && error.status === 401 && (error.code === "token_expired" || error.code === "unauthorized");
      if (!expired || request.anonymous || !session.get()) throw error;
      const next = await refresh();
      if (!next) throw error;
      return transport<T>(request);
    }
  };
}
