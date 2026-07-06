// apps/dashboard — the real SQLite read for the dashboard's server-side
// snapshot (dashboard tasks.md §5.5, design.md Decision 1: "a server-side
// read... the server sends a STATE_SNAPSHOT rebuilt from SQLite" on every
// SSE (re)connect). The ONLY place in `apps/dashboard` that touches
// `@kamerton/db` directly — mirrors `packages/bot/src/pipeline.ts`'s own
// "one module owns the DB touchpoints" discipline (TC-DATA-01).
//
// TYPED THROWING STUB — red state for Stage C of this slice. The signature
// below is the contract pinned by `dashboard-db.test.ts`; the body (reading
// `leads`/`requests`/`bookings` rows and calling `buildStateSnapshot`, §5.2)
// is implemented once that suite is confirmed red.

import type Database from "better-sqlite3";
import type { DashboardState } from "./dashboard-state.ts";

/**
 * Reads the current `leads`/`requests`/`bookings` rows from `db` and
 * assembles a `DashboardState` via `dashboard-state.ts`'s `buildStateSnapshot`
 * (db read here, pure assembly there — design.md Decision 3's split).
 * `weekStartIso` is an explicit "YYYY-MM-DD" argument, never
 * `Date.now()`-derived inside `buildStateSnapshot` — this function is the
 * one place allowed to resolve "today" for the caller (the SSE route, §5.4).
 */
export function readDashboardSnapshot(db: Database.Database, weekStartIso: string): DashboardState {
  throw new Error("apps/dashboard/lib/dashboard-db.ts: readDashboardSnapshot() not implemented");
}
