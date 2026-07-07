// apps/dashboard/lib — currentWeekStartIso, split out of `dashboard-db.ts`
// (booking-hitl S4 rendered-UI gate finding): `dashboard-db.ts` also does
// `path.resolve(path.dirname(fileURLToPath(import.meta.url)), ...)` at
// MODULE TOP LEVEL to compute `repoRoot` — a real `node:url`/`node:path`
// side effect that runs the instant the module is evaluated, not something
// tree-shaking can remove. `DashboardApp.tsx` (a `"use client"` component)
// used to import `currentWeekStartIso` straight from `dashboard-db.ts`,
// which pulled that whole module — and its top-level Node-only side effect
// — into the CLIENT bundle: a real browser threw
// `TypeError: fileURLToPath is not a function` on every page load, a
// hard `pageerror` invisible to the unit-test suite (jsdom/vitest never
// actually evaluate the bundled browser chunk) but fatal in a real
// browser, exactly the class of bug this rendered-UI gate exists to catch.
//
// This module has ZERO Node-only imports — safe for a client component to
// import directly. `dashboard-db.ts` re-exports the same function so every
// existing server-side import site (`page.tsx`, the SSE/decision/ingest/
// leads routes) keeps compiling unchanged.

/**
 * "YYYY-MM-DD" for "today" in Europe/Kyiv wall-clock time (BC-SCHEDULE-01) —
 * the one non-pure "now" resolution the dashboard needs, isolated here so
 * `dashboard-state.ts`/`weekSeatGrid` (lib/) stay pure and deterministically
 * testable via an explicit `weekStartIso`.
 */
export function currentWeekStartIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}
