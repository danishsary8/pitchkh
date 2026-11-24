import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

export function createDb(url = env.databaseUrl) {
  // Dates come back as JS Date objects; numeric(…) columns are converted by the schema.
  const sql = postgres(url, { max: 10, onnotice: () => undefined });
  return { sql, db: drizzle(sql, { schema }) };
}

export type Database = ReturnType<typeof createDb>["db"];
/** A database handle or an open transaction: route code accepts either. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0] | Database;
