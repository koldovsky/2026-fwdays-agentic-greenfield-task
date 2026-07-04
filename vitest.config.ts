import { defineConfig } from "vitest/config";

// Unit layer (TC-TEST-01): pure lib/ + packages. The dashboard has its own
// test setup; integration/e2e layers arrive with their slices.
//
// The third/fourth include entries ("slots/**/*.test.ts", "agent/**/*.test.ts")
// look odd at the repo root but are deliberate: Vitest resolves `include`
// glob patterns relative to `test.dir` (default: the config root), NOT
// relative to the repo root regardless of `dir`. `npm run test:run` runs
// plain `vitest run` (dir = repo root), where no top-level `slots/`/`agent/`
// directory exists, so these entries match nothing there — a no-op for the
// unit layer. `npm run test:integration` runs `vitest run --dir
// tests/integration`, which re-bases every include pattern onto
// `tests/integration/`, so the SAME entries resolve to
// `tests/integration/slots/**/*.test.ts` / `tests/integration/agent/**/*.test.ts`
// and pick up the slots/intake slices' integration suites respectively. This
// is how one config file serves both npm scripts without tests/integration
// ever leaking into `npm run test:run` (verified empirically: `npx vitest
// run` vs `npx vitest run --dir tests/integration` pick up disjoint file
// sets). Real-API/real-DB integration tests are slower than unit tests —
// testTimeout/hookTimeout are raised repo-wide to accommodate them; unit
// tests stay far under the ceiling so this has no practical effect on `npm
// run test:run`'s speed.
export default defineConfig({
  test: {
    include: [
      "lib/**/*.test.ts",
      "packages/**/*.test.ts",
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
