import { defineConfig, devices } from "@playwright/test";

// Mirror the env-var override the webServer uvicorn command sets, so
// the test-runner process can read the same `EPUBTV_DEFAULT_OPENAI_URL`
// when the base-url-default assertion checks the form input. The
// e2e suite runs against the in-network mock-llm-service; production
// defaults to `https://api.openai.com/v1`.
process.env.EPUBTV_DEFAULT_OPENAI_URL ??= "http://127.0.0.1:8765/v1";
process.env.EPUBTV_DEFAULT_OLLAMA_URL ??= "http://127.0.0.1:8765";

/**
 * Playwright config for the F1 @web slice.
 *
 * Architecture (Pitfall G + D-05 discretion):
 *   Single-origin webServer: the test origin is the uvicorn process
 *   serving the API at `/api/v1/*` AND the static `frontend/out/`
 *   export mounted at `/` (StaticFiles, env-gated by
 *   `EPUBTV_SERVE_STATIC=true EPUBTV_FRONTEND_OUT=…`). This eliminates
 *   CORS quirks during the e2e flow — both the SPA's `fetch` to the
 *   API and the page navigation are on the same origin.
 *
 * Sequence per test run:
 *   1. `globalSetup` runs `yarn build` once to refresh `frontend/out/`
 *      (cheap on Turbopack; ~3-7s).
 *   2. `webServer` boots `uvicorn epubtv.main:app` with the static
 *      env on. `reuseExistingServer: true` lets a local `make demo`
 *      runner use the same instance.
 *   3. Each test starts the static `chromium` project with headless
 *      video off (kept on the test-results dir so the final demo
 *      video can be re-recorded via `document-bdd-feature` skill).
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  // 30s per test — the F1 @smoke contract requires <3s end-to-end,
  // so 30s leaves generous room for spinner + network.
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Fully parallel: each test gets its own browser context. The
  // single-uvicorn process handles them serially at the FastAPI level
  // which is fine for F1 (one POST at a time).
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Single worker — the backend is a single uvicorn process; the
  // F2/F5 e2e tests do longer flows (upload + chooser + config + WS)
  // that race the same backend SQLite WAL when run in parallel. v2
  // can re-enable parallelism with a per-test DB.
  workers: 1,

  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    // 1280x720 — 16:9 HD per D-05; matches the corrected
    // `document-bdd-feature` recording config (which mandates
    // 1280x720 per D-03); avoids the scaling artifacts that
    // produced pixelation in the Phase 2 video.
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: require.resolve("./tests/global-setup.ts"),

  // Two `webServer` entries — Playwright waits for BOTH ports to be
  // listening before running any test. The uvicorn backend (5173)
  // talks to the mock-llm-service (8765) via the per-provider URL
  // env vars (EPUBTV_DEFAULT_OPENAI_URL / EPUBTV_DEFAULT_OLLAMA_URL);
  // without the mock, every POST /api/v1/providers/.../models call
  // (the F2 "Load Model List" + F5 WS happy path) hangs the request
  // until the per-test 5s expect timeout, flaking those two flows.
  webServer: [
    {
      command:
        "cd ../backend && uv run python -m epubtv.tools.mock_llm_service",
      port: 8765,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command:
        "cd ../backend && EPUBTV_SERVE_STATIC=true " +
        "EPUBTV_FRONTEND_OUT=../frontend/out " +
        "EPUBTV_DB_PATH=./db/test.db " +
        "EPUBTV_SCRATCH_DIR=./scratch/test " +
        // OpenAI-compatible SDK appends ``/v1/models`` to the host;
        // Ollama SDK appends ``/api/tags`` to the host root (no /v1).
        "EPUBTV_DEFAULT_OPENAI_URL=http://127.0.0.1:8765/v1 " +
        "EPUBTV_DEFAULT_OLLAMA_URL=http://127.0.0.1:8765 " +
        "uv run uvicorn epubtv.main:app --port 5173 --host 127.0.0.1 --workers 1",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
