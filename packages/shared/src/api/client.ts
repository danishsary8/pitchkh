import { DEFAULT_LATENCY, type SharedConfig } from "../config";
import type { MockServer } from "../mock/server";
import { ApiError } from "./errors";
import { createHttpTransport, withTokenRefresh } from "./http";
import { createAdminApi, createAuthApi, createBookingsApi, createChatApi, createMatchesApi, createNotificationsApi, createOwnerApi, createReviewsApi, createVenuesApi } from "./services";
import { SessionStore } from "./session";
import type { ApiRequest, Transport } from "./transport";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "mock" mode transport: routes requests to the in-memory server after a
 * realistic delay. The mock server (handlers, seed data, zod validation) is
 * loaded with a dynamic import on the first request. That keeps it out of the
 * initial bundle of the app, and in "real" mode it is never downloaded at all.
 */
function createMockTransport(getServer: () => Promise<MockServer>, session: SessionStore, latency: readonly [number, number]): Transport {
  return async <T>(request: ApiRequest): Promise<T> => {
    const [min, max] = latency;
    // The simulated latency runs in parallel with loading the mock code.
    const [server] = await Promise.all([getServer(), max > 0 ? sleep(min + Math.random() * (max - min)) : undefined]);
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
  let mockServer: Promise<MockServer> | null = null;
  const getMockServer = (): Promise<MockServer> => {
    mockServer ??= Promise.all([import("../mock/server"), import("../mock/handlers")]).then(([server, handlers]) =>
      handlers.registerAllRoutes(new server.MockServer(config.storage, clock)),
    );
    return mockServer;
  };
  let base: Transport;

  if (config.apiMode === "real") {
    if (!config.fetch) throw new ApiError(0, "server_error", 'apiMode "real" needs a fetch implementation.');
    base = createHttpTransport(config.apiUrl, config.fetch, session);
  } else {
    base = createMockTransport(getMockServer, session, config.latency ?? DEFAULT_LATENCY);
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
      if (config.apiMode === "mock") await (await getMockServer()).reset();
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
