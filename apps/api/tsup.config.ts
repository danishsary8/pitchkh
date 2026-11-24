import { defineConfig } from "tsup";

// One file for production: the shared package ships TypeScript source, so it
// is bundled in rather than resolved at runtime.
export default defineConfig({
  entry: { main: "src/main.ts", migrate: "src/db/migrate.ts", seed: "src/db/seed.ts" },
  format: "esm",
  platform: "node",
  target: "node20",
  noExternal: ["@pitchkh/shared"],
  clean: true,
  sourcemap: true,
  // migrate.js reads the .sql files next to it.
  onSuccess: "cp -r src/db/migrations dist/migrations",
});
