import { ApiError } from "@pitchkh/shared";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { sql } from "drizzle-orm";
import { createRouter, insertNotification, toApiErrorFromDb, type Ctx, type Services } from "./http";
import { bakongProvider } from "./bakong";
import { registerAdminRoutes } from "./routes/admin";
import { registerAuthRoutes } from "./routes/auth";
import { registerBookingRoutes } from "./routes/bookings";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerOwnerRoutes } from "./routes/owner";
import { checkPendingPayments, registerPaymentRoutes } from "./routes/payments";
import { registerSocialRoutes } from "./routes/social";
import { registerTelegramRoutes } from "./routes/telegram";
import { env } from "./env";
import { sandboxProvider } from "./payments";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createMailer, type Mailer } from "./mailer";
import { log, requestIdOf, requestLogger } from "./observability";
import { createRateLimiter, rateLimit } from "./rate-limit";
import { localStorage, r2Storage, type PhotoStorage } from "./storage";
import { alertOwner, type TelegramClient } from "./telegram";
import { registerVenueRoutes } from "./routes/venues";

export function createApp(services: Services, corsOrigins: string[], telegram?: TelegramClient, uploadDir = env.uploadDir): Hono {
  const app = new Hono();
  services = {
    ...services,
    mailer: services.mailer ?? createMailer(env.mail.resendKey, env.mail.from),
    storage: services.storage ?? (env.storage.driver === "r2" ? r2Storage(env.storage.r2) : localStorage(uploadDir, env.publicUrl)),
  };
  // Booking alerts go to the owner's Telegram after the response; a Telegram outage never fails a booking.
  if (telegram && !services.onNotify) {
    services = { ...services, onNotify: (n) => void alertOwner(services.db, telegram, n, services.clock()).catch((e: unknown) => log("error", "telegram alert failed", { error: String(e) })) };
  }
  // Request ID + one JSON log line per request; then standard security headers.
  app.use("*", requestLogger({ enabled: services.logRequests ?? process.env.NODE_ENV !== "test" }));
  // Photos under /uploads are shown on the web app's own domain, so they must be loadable cross-origin.
  app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
  app.use("*", cors({ origin: corsOrigins, allowHeaders: ["Authorization", "Content-Type"], exposeHeaders: ["X-Request-Id", "Retry-After"], allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], maxAge: 600 }));

  // Every error leaves in the contract's shape: { error: { code, message, details } }.
  app.onError((e, c) => {
    const known = e instanceof ApiError ? e : toApiErrorFromDb(e);
    // Unexpected errors are logged with the request ID the client also received.
    if (!known) log("error", "unhandled error", { requestId: requestIdOf(c), method: c.req.method, path: c.req.path, error: e instanceof Error ? (e.stack ?? e.message) : String(e) });
    const err = known ?? new ApiError(500, "server_error", "Something went wrong on our side.");
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status as 400);
  });
  app.notFound((c) => c.json({ error: { code: "not_found", message: `No route for ${c.req.method} ${c.req.path}` } }, 404));

  // Healthy means the database answers (within 2 s). Render restarts the service when this fails.
  app.get("/health", async (c) => {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("database check timed out")), 2_000).unref());
    try {
      await Promise.race([services.db.execute(sql`select 1`), timeout]);
      return c.json({ ok: true, db: "up" });
    } catch (e) {
      log("error", "health check failed", { error: String(e) });
      return c.json({ ok: false, db: "down" }, 503);
    }
  });

  // Uploaded venue photos (local storage). Names are random, so they can be cached forever.
  app.get("/uploads/:name", (c) => {
    const name = c.req.param("name");
    const ext = /^[a-f0-9]{24}\.(jpg|png|webp)$/.exec(name)?.[1];
    const file = ext ? join(uploadDir, name) : "";
    if (!ext || !existsSync(file)) return c.json({ error: { code: "not_found", message: "No such photo." } }, 404);
    return c.body(readFileSync(file), 200, { "content-type": ext === "jpg" ? "image/jpeg" : `image/${ext}`, "cache-control": "public, max-age=31536000, immutable" });
  });

  // All API routes live under /api/v1 (the web app's NEXT_PUBLIC_API_URL ends with it).
  const api = new Hono();
  // Venue photos are up to 4 MB (about 5.4 MB as base64 JSON); nothing else comes close.
  api.use("*", bodyLimit({ maxSize: 6 * 1024 * 1024, onError: () => { throw new ApiError(413, "payload_too_large", "That request is too large. Photos can be up to 4 MB."); } }));
  if (services.rateLimit !== false) api.use("*", rateLimit(createRateLimiter(), "/api/v1"));
  const route = createRouter(api, services);
  registerAuthRoutes(route, services.mailer as Mailer);
  registerVenueRoutes(route);
  registerBookingRoutes(route);
  registerNotificationRoutes(route);
  registerOwnerRoutes(route, services.storage as PhotoStorage);
  registerAdminRoutes(route);
  registerSocialRoutes(route);
  registerTelegramRoutes(route, telegram);
  const provider = services.payments ?? paymentProviderFromEnv();
  registerPaymentRoutes(route, provider);
  if (services.runJobs && provider.checkPaid) {
    const notify: Ctx["notify"] = async (tx, userId, type, params, href, meta) => {
      await insertNotification(tx, services.clock(), userId, type, params, href);
      services.onNotify?.({ userId, type, params, href, meta });
    };
    setInterval(() => {
      checkPendingPayments({ db: services.db, now: services.clock(), notify }, provider).catch((e: unknown) => log("error", "payment job failed", { error: String(e) }));
    }, 10_000).unref();
  }
  app.route("/api/v1", api);
  return app;
}

/** PAYMENT_PROVIDER=bakong needs its keys; anything else uses the sandbox. */
function paymentProviderFromEnv() {
  if (env.payments.provider !== "bakong") return sandboxProvider(env.payments.webhookSecret);
  const b = env.payments.bakong;
  if (!b.token || !b.accountId) throw new Error("PAYMENT_PROVIDER=bakong needs BAKONG_TOKEN and BAKONG_ACCOUNT_ID. See apps/api/.env.example.");
  return bakongProvider(b);
}
