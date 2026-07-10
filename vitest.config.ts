import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit layer (TC-TEST-01): pure lib/ + packages. E2E layers arrive with
// their slices.
//
// "apps/**/*.test.{ts,tsx}" (dashboard tasks.md §5/§6) picks up
// `apps/dashboard/lib/*.test.ts`, `apps/dashboard/app/api/**/route.test.ts`,
// and (Stage D) `apps/dashboard/components/**/*.test.tsx` — co-located next
// to their source — same convention as `lib/`/`packages/`, no separate test
// runner for the dashboard (its own `package.json` has no `test` script;
// this root config is the only one that ever runs these files). Most of
// these are route-handler/server-side tests (plain Node, real
// `better-sqlite3`), never a jsdom/browser suite; the default `environment`
// stays "node" for exactly that reason.
//
// DOM TEST ENVIRONMENT (dashboard tasks.md §6, Stage D): component
// `*.test.tsx` files opt INTO jsdom individually via a per-file
// `// @vitest-environment jsdom` docblock (Vitest's own supported
// mechanism — https://vitest.dev/guide/environment.html#test-environment)
// rather than a global `environment: "jsdom"` or `environmentMatchGlobs`
// (the latter does not exist in this installed Vitest 4.1.9 — verified
// empirically against `node_modules/vitest/dist`, not assumed from older
// docs). This keeps every existing Node-hosted suite (lib/, packages/,
// route handlers) running in the fast default "node" environment — proven
// below by the untouched `fileParallelism`/`include` shape for those files
// — while `apps/dashboard/components/**/*.test.tsx` and any other
// DOM-rendering test opts in per file, self-documenting which tests need a
// DOM. `@vitejs/plugin-react` is registered globally (cheap no-op for
// non-JSX files) so the `.tsx` component tests transform correctly.
//
// The third/fourth/fifth/sixth include entries ("slots/**/*.test.ts",
// "agent/**/*.test.ts", "booking-hitl/**/*.test.ts") look odd at the repo
// root but are deliberate: Vitest resolves `include` glob patterns relative
// to `test.dir` (default: the config root), NOT relative to the repo root
// regardless of `dir`. `npm run test:run` runs plain `vitest run` (dir =
// repo root), where no top-level `slots/`/`agent/`/`booking-hitl/`/`apps/`
// (-shaped) directory exists at that depth, so these entries match nothing
// there — a no-op for the unit layer beyond what they're meant for. `npm run
// test:integration` runs `vitest run --dir tests/integration`, which
// re-bases every include pattern onto `tests/integration/`, so the SAME
// entries resolve to `tests/integration/slots/**/*.test.ts` /
// `tests/integration/agent/**/*.test.ts` /
// `tests/integration/booking-hitl/**/*.test.ts` and pick up the
// slots/intake/booking-hitl slices' integration suites respectively (no
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
  plugins: [react()],
  test: {
    // See vitest.setup.ts's own header comment: inert for every Node-hosted
    // suite, required for `apps/dashboard/components/**/*.test.tsx`'s
    // `render()`-based tests to clean up between tests/files.
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "lib/**/*.test.ts",
      "packages/**/*.test.ts",
      "apps/**/*.test.{ts,tsx}",
      "slots/**/*.test.ts",
      "agent/**/*.test.ts",
      // booking-hitl tasks.md G.1: this slice's own real-SQLite +
      // FakeCalendarPort full-flow test, at
      // `tests/integration/booking-hitl/full-flow.test.ts` once re-based —
      // same "own top-level entry per slice" convention as "slots"/"agent"
      // above (S1/S2 each added their own).
      "booking-hitl/**/*.test.ts",
      // kb-learning tasks.md F.1: this slice's own real-SQLite +
      // FakeTelegramTransport full-flow test, at
      // `tests/integration/kb-learning/full-flow.test.ts` once re-based —
      // same "own top-level entry per slice" convention as
      // "slots"/"agent"/"booking-hitl" above.
      "kb-learning/**/*.test.ts",
    ],
    passWithNoTests: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Coverage ratchet plumbing (scripts/check-coverage-ratchet.mjs): the
    // ratchet reads coverage/coverage-summary.json, which only the
    // "json-summary" reporter emits — without it `check:coverage` SKIPs
    // forever and guards nothing. text/html kept for humans.
    coverage: {
      reporter: ["text", "html", "json-summary"],
    },
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
