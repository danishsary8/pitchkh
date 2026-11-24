import { serve } from "@hono/node-server";
import { loadEnvFile } from "./load-env";

loadEnvFile();
const { env } = await import("./env");
const { createDb } = await import("./db/client");
const { createApp } = await import("./app");
const { createTelegram } = await import("./telegram");

const { db } = createDb();
const telegram = createTelegram(env.telegram);
const app = createApp({ db, clock: () => new Date() }, env.corsOrigins, telegram);
if (!telegram) console.log("Telegram alerts off (set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME to turn them on)");

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`PitchKH API on http://localhost:${info.port}/api/v1`);
});
