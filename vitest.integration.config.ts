import { defineConfig } from "vitest/config";
import path from "node:path";

// Weather Explorer has no DB layer; integration tests live here when added.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
