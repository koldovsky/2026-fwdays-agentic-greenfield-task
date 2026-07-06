import { defineConfig } from "vitest/config";

// Unit layer (TC-TEST-01): pure lib/ + packages. E2E layers arrive with
// their slices.
//
// "apps/**/*.test.ts" (dashboard tasks.md §5, Stage C) picks up
// `apps/dashboard/lib/*.test.ts` and `apps/dashboard/app/api/**/route.test.ts`
// co-located next to their source — same convention as `lib/`/`packages/`,
// no separate test runner for the dashboard (its own `package.json` has no
// `test` script; this root config is the only one that ever runs these
// files). These are route-handler/server-side tests (plain Node, real
// `better-sqlite3`), never a jsdom/browser suite, so no extra `environment`
// setting is needed here.
//
// The third/fourth/fifth include entries ("slots/**/*.test.ts",
// "agent/**/*.test.ts") look odd at the repo root but are deliberate: Vitest
// resolves `include` glob patterns relative to `test.dir` (default: the
// config root), NOT relative to the repo root regardless of `dir`. `npm run
// test:run` runs plain `vitest run` (dir = repo root), where no top-level
// `slots/`/`agent/`/`apps/`(-shaped) directory exists at that depth, so
// these entries match nothing there — a no-op for the unit layer beyond what
// they're meant for. `npm run test:integration` runs `vitest run --dir
// tests/integration`, which re-bases every include pattern onto
// `tests/integration/`, so the SAME entries resolve to
// `tests/integration/slots/**/*.test.ts` / `tests/integration/agent/**/*.test.ts`
// and pick up the slots/intake slices' integration suites respectively (no
// `tests/integration/apps/` directory exists, so "apps/**/*.test.ts" is
// similarly a no-op there — the dashboard's route/db tests intentionally run
// under `test:run`, not `test:integration`, even though they touch a real
// SQLite file, mirroring this slice's own task list). This is how one config
// file serves both npm scripts without tests/integration ever leaking into
// `npm run test:run` (verified empirically: `npx vitest run` vs `npx vitest
// run --dir tests/integration` pick up disjoint file sets). Real-API/real-DB
// integration tests are slower than unit tests — testTimeout/hookTimeout are
// raised repo-wide to accommodate them; unit tests stay far under the
// ceiling so this has no practical effect on `npm run test:run`'s speed.
export default defineConfig({
  test: {
    include: [
      "lib/**/*.test.ts",
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "slots/**/*.test.ts",
      "agent/**/*.test.ts",
    ],
    passWithNoTests: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // The integration suite's files share one external resource (the real
    // DEMO Google Calendar) and each file's beforeAll/afterAll performs a
    // namespace-wide "[itest-slots]" sweep for hermetic reruns — running
    // test FILES in parallel would let one file's sweep delete another
    // file's in-flight seeded event. Sequential file execution costs
    // nothing measurable for the unit layer (already sub-second) and makes
    // the integration layer race-free.
    fileParallelism: false,
  },
});
