import { existsSync } from "node:fs";

/** Loads apps/api/.env (if present) into process.env, without overriding real env vars. */
export function loadEnvFile(path = ".env"): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
