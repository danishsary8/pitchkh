import type { MockServer } from "../server";
import { registerAdminRoutes } from "./admin";
import { registerAuthRoutes } from "./auth";
import { registerBookingRoutes } from "./bookings";
import { registerMatchRoutes } from "./matches";
import { registerOwnerRoutes } from "./owner";
import { registerSocialRoutes } from "./social";
import { registerVenueRoutes } from "./venues";

export function registerAllRoutes(server: MockServer): MockServer {
  registerAuthRoutes(server);
  registerVenueRoutes(server);
  registerBookingRoutes(server);
  registerMatchRoutes(server);
  registerSocialRoutes(server);
  registerOwnerRoutes(server);
  registerAdminRoutes(server);
  return server;
}
