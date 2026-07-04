import { defineConfig, devices } from "@playwright/test";

// E2E against the Next.js dev server. Run: npm run test:e2e
// Pattern adapted from lab-test-booking (simplified — no isolated DB).
const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /(scheduled|wizard-scheduled)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "schedule-serial",
      testMatch: /(scheduled|wizard-scheduled)\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      COLIBRI_SUBMIT_MODE: "stub",
    },
  },
});
