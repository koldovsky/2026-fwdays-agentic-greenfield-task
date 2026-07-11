import { execSync } from "node:child_process";

/**
 * Playwright global setup: refresh the static export BEFORE the test
 * run so the uvicorn StaticFiles mount serves the latest SPA build.
 *
 * `yarn build` is cheap on Turbopack (~3-7s) and idempotent — we run
 * it once per `playwright test` invocation, not per test. If a
 * developer is iterating on the SPA, they should `yarn dev` instead
 * (D-03 dual-dev).
 *
 * `NEXT_PUBLIC_API_BASE` is build-time inlined by Next.js. The
 * playwright `webServer` boots the backend on port 5173 (single-origin
 * with the SPA), so we pin the env to that origin for the e2e run.
 */
export default async function globalSetup() {
  console.log("[playwright:setup] Refreshing frontend/out via yarn build");
  execSync("yarn build", {
    // biome-ignore lint/style/useTemplate: string concat is fine for a one-shot path; not a hot path
    cwd: __dirname + "/..",
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_PUBLIC_API_BASE: "http://localhost:5173/api/v1",
    },
  });
}
