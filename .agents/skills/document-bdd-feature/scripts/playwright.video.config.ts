// D-03: video always on, slowMo=500, viewport=1280x720 — keep in sync with SKILL.md.
// (slowMo settled at 500 in 02.1-04 per ADR 0011 → 1000 transient per 2026-07-06 user feedback → 500 again on 2026-07-07 to re-align with the D-06 BDD test calibration baseline. The 1000ms spike was a transient experiment; 500 is the documented settle-point.)
// D-05: 1280x720 alignment with frontend/playwright.config.ts.
// D-06: config is fully runnable (projects + webServer) so the dimension-asserting
//       BDD scenario in backend/tests/bdd/test_documentation_video_dimensions.py
//       can spawn `npx playwright test --config=<this file>` as a subprocess and
//       produce a real webm for ffprobe to probe.
// Quick 20260711-0910: visual recording enhancements — the skill now ships
//       `visual-helper.js` (the mouse trail + focus outline overlay) and
//       `visual-helper-fixture.ts` (the test fixture that auto-injects the
//       helper via `context.addInitScript()` in `beforeEach`). To enable
//       the visual helper, point the spec file's `import { test, expect }`
//       at the fixture file — see SKILL.md "Visual recording enhancements"
//       for the full opt-in pattern. The helper is OFF by default for
//       the D-06 BDD dimension scenario (it must not change the recorded
//       canvas dimensions; the cursor + outline are pure page-side
//       overlays and do not affect the webm dimensions, but the helper
//       is still opt-in to keep the recording pipeline minimal).
//
// Location note: this file lives at .agents/skills/document-bdd-feature/scripts/,
// NOT inside frontend/. Two side effects:
//   1. The `@playwright/test` import resolves via `node_modules` walking up from
//      THIS file's directory; there is no node_modules above .agents/, so the
//      BDD test (and any manual user) MUST run `npx playwright test` with
//      `NODE_PATH=frontend/node_modules` (or a frontend/ CWD + the frontend
//      node_modules adjacent to `npx`'s resolution).
//   2. Playwright's webServer `cwd` is the directory containing this config
//      (not the test runner's CWD), so the `command` resolves the backend /
//      frontend-out paths from the config's location. We compute absolute
//      paths from `__dirname` to make the config hermetic.
import { defineConfig, devices } from '@playwright/test';
import * as os from 'os';
import * as path from 'path';

const configDir = __dirname;
// .agents/skills/document-bdd-feature/scripts -> up 4 to repo root.
const repoRoot = path.resolve(configDir, '..', '..', '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');
const testsDir = path.join(frontendDir, 'tests');
const backendDir = path.join(repoRoot, 'backend');
const frontendOutDir = path.join(repoRoot, 'frontend', 'out');
const tmpVideoDir = path.join(os.tmpdir(), `pw-video-record-${Date.now()}`);

export default defineConfig({
  // testDir is absolute (computed from this config's __dirname) because
  // Playwright resolves relative testDir against the config file's
  // directory, NOT against the test runner's CWD. Spec files live in
  // frontend/tests/steps/*.spec.ts — discovered from `testsDir`.
  testDir: testsDir,
  testMatch: /.*\.spec\.ts$/,
  // Single worker — the backend is a single uvicorn process; serializing the
  // recording-driven run keeps the SQLite WAL single-writer invariant.
  workers: 1,
  // 90s per test — most F1/F2 @smoke scenarios finish in <10s once you
  // account for slowMo=500, but a few cross-cutting flows (upload +
  // chooser + config + WS connect) stretch to 15-20s end-to-end. The
  // previous 60s upper bound was raised to 1000 (2026-07-06 user feedback),
  // settled back to 500 (2026-07-07) — see the top-of-file history comment.
  timeout: 90_000,
  // 15s per-expect timeout — slowMo=500 stretches metadata-fetch
  // round-trips past the default 5s. A user-visible scenario (upload
  // → metadata visible) under slowMo=500 takes ~5-7s; we need at
  // least 10s to absorb that + a small buffer for CI jitter.
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // D-03: video always on (NOT 'retain-on-failure' — the recording IS the
    // deliverable, not the failure artifact).
    video: {
      mode: 'on',
      // D-05: 1280x720 — matches the project config + the corrected skill defaults.
      size: {
        width: 1280,
        height: 720,
      },
    },
    // D-05: 1280x720 viewport — 16:9 HD, no HiDPI-scaling distortion.
    viewport: {
      width: 1280,
      height: 720,
    },
    // D-03: slowMo=750 produces comprehensible recordings of the
    // SPA's button clicks + form fills (Playwright's default speed
    // is too fast for a human-readable video review).
    // Playwright Test exposes the underlying LaunchOptions via the
    // `launchOptions` key in `use` (NOT `use.slowMo`, which does not exist).
    // slowMo was 500 in 02.1-04 (ADR 0011); 2026-07-06 user feedback raised
    // it to 1000; 2026-07-07 settled back to 500; 2026-07-11 raised to
    // 750 for a slower, easier-to-read demo cadence.
    launchOptions: {
      slowMo: 750,
    },
    // D-03 (NEW 2026-07-07): the new motion setting — calmer chooser + skeleton-loader transitions for the demo viewer; mirrors the prefers-reduced-motion media query. Type confirmed against frontend/node_modules/playwright-core/types/types.d.ts:22339 ('null | "reduce" | "no-preference"').
    reducedMotion: 'reduce',
  },

  // Single chromium project — matches the project config. The
  // `launchOptions.slowMo` is duplicated here (now `slowMo=750`) to
  // defend against a known Playwright-Test quirk: when a project's
  // `use` does not include `launchOptions`, the top-level
  // `use.launchOptions` is NOT always inherited (the deep-merge
  // behaviour is shallow on `launchOptions`). Setting it on the
  // project guarantees the slowMo applies regardless of the merge
  // strategy.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { slowMo: 750 },
      },
    },
  ],

  // Mirror the project webServer so the config is self-contained when the
  // D-06 BDD scenario runs it as a subprocess. reuseExistingServer lets a
  // dev runner reuse a manually-started `make demo` server.
  // The webServer command uses absolute paths (computed from this config's
  // __dirname) because Playwright runs the command with the CWD set to the
  // directory containing THIS file, not to the playwright process CWD.
  //
  // Quick 20260711-0910: the config now also boots the mock-llm service
  // (the OpenAI-compatible consolidated mock from Phase 1 plan 04) on
  // 127.0.0.1:8765, then points the backend's
  // ``EPUBTV_DEFAULT_OLLAMA_URL`` + ``EPUBTV_DEFAULT_OPENAI_URL`` at the
  // loopback host. The default docker-compose values
  // (``http://mock-llm:8765/...``) resolve only in the in-network DNS
  // namespace; on a local dev runner ``mock-llm`` does not resolve. The
  // second webServer entry brings up the mock-llm subprocess on
  // 127.0.0.1:8765 so the recording can run end-to-end.
  webServer: [
    {
      // Mock LLM service first — the backend's lifespan composition root
      // constructs the three per-provider HTTP adapter subclasses at
      // startup and probes the URLs immediately, so the mock must be
      // reachable before the backend boots.
      command:
        `cd ${backendDir} && ` +
        `uv run python -m epubtv.tools.mock_llm_service ` +
        `--host 127.0.0.1 --port 8765`,
      port: 8765,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Backend on 5173 (the same origin as the SPA + the same
      // dev port the project config uses). The per-provider URLs
      // point at the loopback mock-llm service above.
      command:
        `cd ${backendDir} && ` +
        `EPUBTV_SERVE_STATIC=true ` +
        `EPUBTV_FRONTEND_OUT=${frontendOutDir} ` +
        `EPUBTV_DB_PATH=./db/test.db ` +
        `EPUBTV_SCRATCH_DIR=./scratch/test ` +
        `EPUBTV_DEFAULT_OLLAMA_URL=http://127.0.0.1:8765/ ` +
        `EPUBTV_DEFAULT_OPENAI_URL=http://127.0.0.1:8765/v1 ` +
        `uv run uvicorn epubtv.main:app --port 5173 --host 127.0.0.1 --workers 1`,
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],

  outputDir: tmpVideoDir,

  reporter: [['list']],

  onTestEnd: async () => {
    console.log(`\n[video-record] Videos written to: ${tmpVideoDir}`);
    console.log('[video-record] Remember to clean up this directory after moving the video.');
  },
});
