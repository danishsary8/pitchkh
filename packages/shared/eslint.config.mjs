import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Shared code must stay platform-agnostic: no DOM, no React, no Next.js. */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["react", "react-*", "next", "next/*", "@/*"], message: "packages/shared must stay platform-agnostic." }] },
      ],
      "no-restricted-globals": ["error", "window", "document", "localStorage", "sessionStorage", "navigator"],
    },
  },
);
