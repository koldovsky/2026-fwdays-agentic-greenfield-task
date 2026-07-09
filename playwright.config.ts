import { defineConfig, devices } from "@playwright/test";

// Demo-capture config (NOT a test-gate — this drives the app to RECORD a video).
// `video: "on"` writes a .webm per test into test-results/; the demo:convert
// script transcodes it to public/demo.mp4 for Remotion to embed.
//
// The app is started by Playwright's webServer. The demo route-mocks the
// tailoring API (see e2e/demo.spec.ts), so no Anthropic key / spend is needed —
// but the app still server-renders, so a local DB + .env are required
// (see docs/demo-video.md). Run: `yarn demo:capture`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    video: "on",
    // 1080p canvas so the recording drops straight into a 1920x1080 Remotion comp.
    viewport: { width: 1920, height: 1080 },
    // Slow the driver so each step is readable on screen.
    launchOptions: { slowMo: 550 },
    trace: "on",
  },
  projects: [{ name: "demo", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
