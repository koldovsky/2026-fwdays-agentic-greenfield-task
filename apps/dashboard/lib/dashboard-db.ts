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
import type { LeadRow, RequestRow } from "@kamerton/db";
import { buildStateSnapshot, type DashboardBookingRow, type DashboardState } from "./dashboard-state.ts";

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

  return buildStateSnapshot({ leads, requests, bookings }, weekStartIso);
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

/**
 * "YYYY-MM-DD" for "today" in Europe/Kyiv wall-clock time (BC-SCHEDULE-01) —
 * the one non-pure "now" resolution the SSE route (§5.4) needs, isolated
 * here (server-only glue) so `dashboard-state.ts`/`weekSeatGrid` (lib/) stay
 * pure and deterministically testable via an explicit `weekStartIso`.
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
