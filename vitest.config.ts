import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests cover the framework-free lib/ core (metric aggregation + scoring).
// See TC-STACK-06 / TC-PURE-01: lib/ imports no next/*, react, or DOM globals,
// so a plain node environment is all these tests need.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
