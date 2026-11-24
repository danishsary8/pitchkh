import { serve } from "@hono/node-server";
import { loadEnvFile } from "./load-env";

loadEnvFile();
const { env } = await import("./env");
const { createDb } = await import("./db/client");
const { createApp } = await import("./app");

const { db } = createDb();
const app = createApp({ db, clock: () => new Date() }, env.corsOrigins);

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`PitchKH API on http://localhost:${info.port}/api/v1`);
});
