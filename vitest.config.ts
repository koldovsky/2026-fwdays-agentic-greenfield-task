import { defineConfig } from "vitest/config";

// Unit layer (TC-TEST-01): pure lib/ + packages. The dashboard has its own
// test setup; integration/e2e layers arrive with their slices.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "packages/**/*.test.ts"],
    passWithNoTests: true,
  },
});
