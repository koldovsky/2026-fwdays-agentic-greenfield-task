import { defineConfig } from "@playwright/test";

// Browser E2E specs go in tests/e2e/. Demo recordings use scripts/record-demos.mjs.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
});
