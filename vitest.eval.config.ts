import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Config for the AI evals only (`npm run eval:ai`). These make real, paid
 * Claude API calls and need ANTHROPIC_API_KEY; they are excluded from the
 * default unit run (vitest.config.ts) and skip themselves without a key.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.eval.test.ts"],
    environment: "node",
    // Model latency: a few turns can take tens of seconds.
    testTimeout: 60_000,
  },
});
