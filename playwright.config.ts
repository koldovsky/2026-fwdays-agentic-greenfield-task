import { defineConfig, devices } from "@playwright/test";

// E2E + recording harness target. The dev/build server is started on demand.
//
// The whole suite runs against a DEDICATED SQLite file (E2E_DATABASE_URL) so it
// never clobbers the developer's data/app.db, on a DEDICATED PORT (3100) so it
// never reuses a stray dev/manual `next dev` server already on 3000 (which would
// be reading the wrong DB and make the suite read foreign data). globalSetup
// migrates + seeds the file BEFORE the webServer boots, and the webServer is
// handed the SAME DATABASE_URL + PORT so `next start` serves exactly what we
// seeded.
const E2E_DB_URL = process.env.E2E_DATABASE_URL ?? "file:./data/e2e.db";
const E2E_PORT = process.env.E2E_PORT ?? "3100";
const E2E_BASE_URL = process.env.BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  // Specs use the `.e2e.ts` suffix (the helpers/ dir is excluded by this).
  testMatch: "**/*.e2e.ts",
  // Mutating E2E flows (water-now, add/delete) share one DB file, so run files
  // serially to keep the seeded baseline deterministic across specs.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "html" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && npm run start -- -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    // Never reuse a foreign server: a stray dev server on another port reads the
    // wrong DB. Always start our own on the dedicated E2E port + DB.
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL: E2E_DB_URL },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
