import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Unit and API-route tests. Route handlers run in Node against the in-memory store. */
export default defineConfig({
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
      // `server-only` throws outside a React Server environment; in tests it is a no-op.
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
