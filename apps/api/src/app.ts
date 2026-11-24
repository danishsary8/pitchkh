import { ApiError } from "@pitchkh/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRouter, toApiErrorFromDb, type Services } from "./http";
import { registerAdminRoutes } from "./routes/admin";
import { registerAuthRoutes } from "./routes/auth";
import { registerBookingRoutes } from "./routes/bookings";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerOwnerRoutes } from "./routes/owner";
import { registerVenueRoutes } from "./routes/venues";

export function createApp(services: Services, corsOrigins: string[]): Hono {
  const app = new Hono();
  app.use("*", cors({ origin: corsOrigins, allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], maxAge: 600 }));

  // Every error leaves in the contract's shape: { error: { code, message, details } }.
  app.onError((e, c) => {
    const known = e instanceof ApiError ? e : toApiErrorFromDb(e);
    if (!known) console.error(e);
    const err = known ?? new ApiError(500, "server_error", "Something went wrong on our side.");
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status as 400);
  });
  app.notFound((c) => c.json({ error: { code: "not_found", message: `No route for ${c.req.method} ${c.req.path}` } }, 404));

  app.get("/health", (c) => c.json({ ok: true }));

  // All API routes live under /api/v1 (the web app's NEXT_PUBLIC_API_URL ends with it).
  const api = new Hono();
  const route = createRouter(api, services);
  registerAuthRoutes(route);
  registerVenueRoutes(route);
  registerBookingRoutes(route);
  registerNotificationRoutes(route);
  registerOwnerRoutes(route);
  registerAdminRoutes(route);
  app.route("/api/v1", api);
  return app;
}
