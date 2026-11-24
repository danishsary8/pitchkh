/**
 * Boots the real API against the test database with a frozen clock and gives
 * back the same typed client the web app uses, in "real" (HTTP) mode.
 */
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { createApiClient, createMemoryStorage } from "@pitchkh/shared";
import { createApp } from "../src/app";
import { createDb } from "../src/db/client";
import { migrate } from "../src/db/migrate";
import { seed } from "../src/db/seed";
import type { TelegramClient } from "../src/telegram";

export const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://pitchkh:pitchkh@localhost:5432/pitchkh_test";
/** 10:00 in Phnom Penh on 12 Nov 2026, the same instant the shared mock tests use. */
export const NOW = new Date("2026-11-12T03:00:00Z");

export async function startTestApi(now = NOW, telegram?: TelegramClient) {
  await migrate(TEST_DB, () => undefined);
  const { sql, db } = createDb(TEST_DB);
  await seed(db, now);
  const app = createApp({ db, clock: () => now }, ["http://localhost:3000"], telegram);
  const server = serve({ fetch: app.fetch, port: 0 });
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://localhost:${(server.address() as AddressInfo).port}/api/v1`;
  return {
    base,
    sql,
    client: () => createApiClient({ apiMode: "real", apiUrl: base, storage: createMemoryStorage(), fetch: (input, init) => fetch(input, init) }),
    stop: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await sql.end();
    },
  };
}
