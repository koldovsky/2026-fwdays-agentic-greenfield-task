import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the `@/*` path alias from tsconfig.json so unit tests import the
    // same way app code does.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // lib/ holds pure, framework-free logic; app/ holds co-located route tests
    // (e.g. queries.test.ts next to server components). Both are included.
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    // *.eval.test.ts make real (paid) Claude API calls — never part of the
    // default unit run; run them with `npm run eval:ai` (vitest.eval.config.ts).
    exclude: [...configDefaults.exclude, "**/*.eval.test.ts"],
    environment: "node",
  },
});
