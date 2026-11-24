import { ApiError } from "@pitchkh/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
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
import { localStorage, type PhotoStorage } from "./storage";
import { alertOwner, type TelegramClient } from "./telegram";
import { registerVenueRoutes } from "./routes/venues";

export function createApp(services: Services, corsOrigins: string[], telegram?: TelegramClient, uploadDir = env.uploadDir): Hono {
  const app = new Hono();
  services = {
    ...services,
    mailer: services.mailer ?? createMailer(env.mail.resendKey, env.mail.from),
    storage: services.storage ?? localStorage(uploadDir, env.publicUrl),
  };
  // Booking alerts go to the owner's Telegram after the response; a Telegram outage never fails a booking.
  if (telegram && !services.onNotify) {
    services = { ...services, onNotify: (n) => void alertOwner(services.db, telegram, n, services.clock()).catch((e: unknown) => console.error("telegram alert failed", e)) };
  }
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
      checkPendingPayments({ db: services.db, now: services.clock(), notify }, provider).catch((e: unknown) => console.error("payment job failed", e));
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
