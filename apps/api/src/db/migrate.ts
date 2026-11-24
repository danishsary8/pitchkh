/**
 * Applies migrations/*.sql in name order, once each, inside a transaction.
 * Run with: pnpm --filter @pitchkh/api db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadEnvFile } from "../load-env";

export async function migrate(url: string, log = console.log): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const dir = fileURLToPath(new URL("./migrations/", import.meta.url));
    const done = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(name)) continue;
      const body = readFileSync(dir + name, "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO schema_migrations (name) VALUES (${name})`;
      });
      log(`applied ${name}`);
    }
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnvFile();
  const { env } = await import("../env");
  await migrate(env.databaseUrl);
  console.log("migrations up to date");
}
