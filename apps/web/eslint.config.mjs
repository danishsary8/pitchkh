import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "public/**", "scripts/**"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // UI must go through api services, never the mock layer.
      "no-restricted-imports": ["error", { patterns: [{ group: ["@pitchkh/shared/src/*", "@pitchkh/shared/mock", "**/mock/*"], message: "Import from @pitchkh/shared and use api services." }] }],
    },
  },
]);
