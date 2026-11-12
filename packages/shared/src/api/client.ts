import { DEFAULT_LATENCY, type SharedConfig } from "../config";
import { registerAllRoutes } from "../mock/handlers";
import { MockServer } from "../mock/server";
import { ApiError } from "./errors";
import { createHttpTransport, withTokenRefresh } from "./http";
import { createAdminApi, createAuthApi, createBookingsApi, createChatApi, createMatchesApi, createNotificationsApi, createOwnerApi, createReviewsApi, createVenuesApi } from "./services";
import { SessionStore } from "./session";
import type { ApiRequest, Transport } from "./transport";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** "mock" mode transport: routes requests to the in-memory server after a realistic delay. */
function createMockTransport(server: MockServer, session: SessionStore, latency: readonly [number, number]): Transport {
  return async <T>(request: ApiRequest): Promise<T> => {
    const [min, max] = latency;
    if (max > 0) await sleep(min + Math.random() * (max - min));
    return server.handle<T>(request, request.anonymous ? null : (session.get()?.accessToken ?? null));
  };
}

/**
 * Builds the whole API surface for one platform. Call once at app start:
 *
 *   const api = createApiClient({ apiMode: "mock", apiUrl: "", storage });
 *   const venues = await api.venues.list({ sport: "football" });
 */
export function createApiClient(config: SharedConfig) {
  const session = new SessionStore(config.storage);
  const clock = config.now ?? (() => new Date());
  let mockServer: MockServer | null = null;
  let base: Transport;

  if (config.apiMode === "real") {
    if (!config.fetch) throw new ApiError(0, "server_error", 'apiMode "real" needs a fetch implementation.');
    base = createHttpTransport(config.apiUrl, config.fetch, session);
  } else {
    mockServer = registerAllRoutes(new MockServer(config.storage, clock));
    base = createMockTransport(mockServer, session, config.latency ?? DEFAULT_LATENCY);
  }
  const transport = withTokenRefresh(base, session, config.onSessionExpired);

  return {
    mode: config.apiMode,
    session,
    auth: createAuthApi(transport, session),
    venues: createVenuesApi(transport),
    bookings: createBookingsApi(transport),
    matches: createMatchesApi(transport),
    chat: createChatApi(transport),
    reviews: createReviewsApi(transport),
    notifications: createNotificationsApi(transport),
    owner: createOwnerApi(transport),
    admin: createAdminApi(transport),
    /** Mock mode only: wipe demo data back to the seed. No-op in real mode. */
    resetMockData: async (): Promise<void> => {
      await mockServer?.reset();
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
