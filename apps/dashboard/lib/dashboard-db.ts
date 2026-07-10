// apps/dashboard — the real SQLite read for the dashboard's server-side
// snapshot (dashboard tasks.md §5.5, design.md Decision 1: "a server-side
// read... the server sends a STATE_SNAPSHOT rebuilt from SQLite" on every
// SSE (re)connect). The ONLY place in `apps/dashboard` that touches
// `@kamerton/db` directly — mirrors `packages/bot/src/pipeline.ts`'s own
// "one module owns the DB touchpoints" discipline (TC-DATA-01).
//
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import type { LeadRow, MessageRow, RequestRow } from "@kamerton/db";
import { buildStateSnapshot, type DashboardBookingRow, type DashboardState } from "./dashboard-state.ts";

// Re-exported so every existing server-side import site keeps compiling
// unchanged — see `current-week.ts`'s own header for why the FUNCTION BODY
// moved out of this file (a client component must never import it from
// here: this module's `repoRoot` line below runs a Node-only `node:url`
// side effect at import time).
export { currentWeekStartIso } from "./current-week.ts";

/**
 * Reads the current `leads`/`requests`/`bookings` rows from `db` and
 * assembles a `DashboardState` via `dashboard-state.ts`'s `buildStateSnapshot`
 * (db read here, pure assembly there — design.md Decision 3's split).
 * `weekStartIso` is an explicit "YYYY-MM-DD" argument, never
 * `Date.now()`-derived inside `buildStateSnapshot` — this function is the
 * one place allowed to resolve "today" for the caller (the SSE route, §5.4).
 */
export function readDashboardSnapshot(db: Database.Database, weekStartIso: string): DashboardState {
  const leads = db.prepare(`SELECT * FROM leads`).all() as LeadRow[];
  const requests = db.prepare(`SELECT * FROM requests`).all() as RequestRow[];
  const bookings = db.prepare(`SELECT * FROM bookings`).all() as DashboardBookingRow[];
  // The persisted conversation transcript feeds `conversationMessages`, so the
  // live "Розмови" panel survives a page reload (design.md Decision 1's
  // snapshot-on-connect discipline — the transcript is DB truth too, not just
  // the ephemeral SSE stream). `buildStateSnapshot` keeps only the rows whose
  // request is active, so reading all rows here is correct and simple; ordered
  // oldest-first to match `findMessagesForRequest`'s own contract.
  const messages = db.prepare(`SELECT * FROM messages ORDER BY id ASC`).all() as MessageRow[];

  return buildStateSnapshot({ leads, requests, bookings, messages }, weekStartIso);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Resolves the ONE physical SQLite file both the bot and this dashboard
 * read/write, from `KAMERTON_DB_PATH` — the SAME env var
 * `packages/bot/src/index.ts` reads (route.ts's own header comment:
 * "deliberately reused, not a second name"). Falls back to the repo-root
 * `kamerton.db`, mirroring the bot's own default.
 */
export function resolveDbPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.KAMERTON_DB_PATH ?? path.join(repoRoot, "kamerton.db");
}
