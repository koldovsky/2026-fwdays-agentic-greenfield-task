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
      ".demo/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // packages/* are Node-hosted (adapters, bot, agent) — unlike lib/, which
    // stays framework-free (TC-PURE-01), they legitimately touch
    // process/console/etc. Scoped here rather than repo-wide so lib/ globals
    // stay minimal. tests/integration/** shares the same need: it is
    // Node-hosted test infra (loads `.env` via `process.loadEnvFile`, logs
    // manual-inspection output via `console.log`), never part of the
    // framework-free lib/ boundary.
    files: [
      "packages/**/*.ts",
      "packages/**/*.mjs",
      "packages/**/*.js",
      "tests/**/*.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
);
