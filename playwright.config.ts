import { defineConfig, devices } from '@playwright/test'

// ADR-013: the reader renders book content on a SEPARATE origin. e2e therefore runs TWO dev servers —
// the app (:5173) and the reader frame (:5174, a different origin) — so the cross-origin postMessage
// bridge and the same-origin-policy isolation are exercised end-to-end in a real browser.
//
// add-visual-polish-e2e (ch11) adds four PROJECTS alongside the existing `chromium` e2e specs:
//   • visual      — Tier-1 maket pixelmatch + Tier-2 committed golden snapshots (release acceptance gate)
//   • a11y        — @axe-core/playwright (no serious/critical) + keyboard/focus-trap tests
//   • responsive  — no-overflow + phone-maket checks across viewport widths
//   • komga-e2e   — the offline happy-path against the throwaway Docker Komga (skips when unreachable)
// The `chromium` project keeps running the prior specs; its `testIgnore` keeps the new project dirs out
// of it so a full run executes each spec exactly once.
//
// RECURRING GOTCHA: `reuseExistingServer: true` means a STALE :5173/:5174 dev server from a previous run
// will serve old JS and silently break captures/e2e. Kill them before a fresh capture run:
//   pnpm exec playwright test --project=visual    # only after: pkill -f "vite.*517[34]"
// then let Playwright start clean servers.
//
// Golden snapshots are committed under e2e/<project>/snapshots/ (the deliberate Tier-2 drift baseline).
const DESKTOP = devices['Desktop Chrome']

// Ports are env-overridable so a run can dodge a port already taken by another project on the host.
// Defaults keep the documented 5173/5174 contract. The reader frame's port is baked into e2e specs
// (`READER_ORIGIN`), so prefer moving only the app.
const APP_PORT = Number(process.env.EDDA_APP_PORT ?? 5173)
const FRAME_PORT = Number(process.env.EDDA_FRAME_PORT ?? 5174)
const APP_ORIGIN = `http://localhost:${APP_PORT}`
const FRAME_ORIGIN = `http://localhost:${FRAME_PORT}`

// src/main.ts binds the in-memory FixtureConnector ONLY when `localStorage['edda.seed'] === 'fixture'`
// — production shows real server data or the "Connect a source" empty state, never a demo catalog.
// The maket-driven suites (library / book detail / reader / a11y / responsive / visual) are written
// against that catalog, so they must opt in. Seeding via storageState lands the flag before any page
// script runs, which is what main.ts reads. `komga-e2e` is deliberately NOT seeded: it connects a real
// server and must see the same cold start a user does.
const FIXTURE_SEED = {
  cookies: [],
  origins: [{ origin: APP_ORIGIN, localStorage: [{ name: 'edda.seed', value: 'fixture' }] }],
}

export default defineConfig({
  testDir: './e2e',
  outputDir: './loop/artifacts/_playwright/output',
  // Committed golden snapshots live in a per-project, per-spec folder — predictable & reviewable.
  snapshotPathTemplate: 'e2e/{projectName}/snapshots/{testFileName}/{arg}{ext}',
  reporter: [['html', { outputFolder: './loop/artifacts/_playwright/report', open: 'never' }]],
  use: {
    baseURL: APP_ORIGIN,
    video: 'on', // the feature demo the user asked for
    trace: 'on',
    screenshot: 'only-on-failure',
  },
  // Tier-2 golden drift gate: a tight default for every toHaveScreenshot() unless a spec overrides it.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  projects: [
    {
      name: 'chromium',
      // The pre-ch11 specs. Keep the new project dirs out so they don't double-run here.
      testIgnore: ['visual/**', 'a11y/**', 'responsive/**', 'komga/**'],
      use: { ...DESKTOP, storageState: FIXTURE_SEED },
    },
    {
      name: 'visual',
      testMatch: 'visual/**/*.spec.ts',
      // Fixed viewport matching the maket app-content area; reduced motion + UTC for deterministic capture.
      use: {
        ...DESKTOP,
        storageState: FIXTURE_SEED,
        viewport: { width: 1300, height: 796 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        timezoneId: 'UTC',
        locale: 'en-US',
      },
    },
    {
      name: 'a11y',
      testMatch: 'a11y/**/*.spec.ts',
      use: { ...DESKTOP, storageState: FIXTURE_SEED, reducedMotion: 'reduce' },
    },
    {
      name: 'responsive',
      // Each test sets its own viewport (phone/tablet/desktop); reduced motion for stable shots.
      testMatch: 'responsive/**/*.spec.ts',
      use: { ...DESKTOP, storageState: FIXTURE_SEED, reducedMotion: 'reduce', timezoneId: 'UTC', locale: 'en-US' },
    },
    {
      name: 'komga-e2e',
      testMatch: 'komga/**/*.spec.ts',
      use: { ...DESKTOP, video: 'on' },
    },
  ],
  webServer: [
    {
      command: `pnpm dev --port ${APP_PORT} --strictPort`,
      url: APP_ORIGIN,
      env: { VITE_READER_ORIGIN: FRAME_ORIGIN },
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // The reader-frame origin (ADR-013). A different port = a different origin than the app.
      command: `pnpm dev:frame --port ${FRAME_PORT} --strictPort`,
      url: FRAME_ORIGIN,
      env: { VITE_APP_ORIGIN: APP_ORIGIN },
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
