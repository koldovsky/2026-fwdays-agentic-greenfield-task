import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config (CHECKLIST G5, TC-TEST-01). Headless by design — runs
 * against the same dev server CI/local `npm run dev` would use, hitting the
 * live NBU API (no mocking — consistent with this project's "verify against
 * real data" practice throughout Stage 5).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
