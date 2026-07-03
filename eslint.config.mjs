import js from "@eslint/js";
import tseslint from "typescript-eslint";

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
);
