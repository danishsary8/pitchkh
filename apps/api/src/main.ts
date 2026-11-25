import { serve } from "@hono/node-server";
import { loadEnvFile } from "./load-env";

loadEnvFile();
const { env } = await import("./env");
const { createDb } = await import("./db/client");
const { createApp } = await import("./app");
const { createTelegram } = await import("./telegram");
const { log } = await import("./observability");

const { sql, db } = createDb();
const telegram = createTelegram(env.telegram);
const app = createApp({ db, clock: () => new Date(), runJobs: true }, env.corsOrigins, telegram);
log("info", "starting", { payments: env.payments.provider, storage: env.storage.driver, telegram: !!telegram });
if (!telegram) log("info", "Telegram alerts off (set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME to turn them on)");
// Unpaid online bookings give their slot back when the hold runs out.
const { releaseExpiredHolds } = await import("./routes/bookings");
setInterval(() => {
  releaseExpiredHolds(db, new Date()).catch((e: unknown) => log("error", "releasing expired holds failed", { error: String(e) }));
}, 60_000).unref();

const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
  log("info", "listening", { url: `http://localhost:${info.port}/api/v1` });
});

// On redeploy Render sends SIGTERM: stop taking new requests, let the ones in flight
// finish, close the database pool, then exit. Forced exit if that takes over 10 s.
let stopping = false;
const shutdown = (signal: string): void => {
  if (stopping) return;
  stopping = true;
  log("info", "shutting down", { signal });
  setTimeout(() => {
    log("error", "shutdown timed out, exiting");
    process.exit(1);
  }, 10_000).unref();
  server.close(() => {
    sql.end({ timeout: 5 }).finally(() => {
      log("info", "stopped");
      process.exit(0);
    });
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
