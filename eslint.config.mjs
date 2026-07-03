import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// Root flat config covers lib/ + packages/. apps/dashboard lints with its own
// Next.js config; vendored factory scripts and generated artifacts are ignored.
export default tseslint.config(
  {
    ignores: [
      "apps/**",
      "node_modules/**",
      "**/.next/**",
      "scripts/**",
      "evals/**",
      "coverage/**",
      "trace/**",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // packages/* are Node-hosted (adapters, bot, agent) — unlike lib/, which
    // stays framework-free (TC-PURE-01), they legitimately touch
    // process/console/etc. Scoped here rather than repo-wide so lib/ globals
    // stay minimal.
    files: ["packages/**/*.ts", "packages/**/*.mjs", "packages/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
