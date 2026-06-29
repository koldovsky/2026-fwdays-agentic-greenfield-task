import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

// SQLite + Drizzle client (ADR-0001). DATABASE_URL may be a `file:` URL or a
// bare path; ":memory:" is honored for tests. A dev singleton avoids opening a
// new handle on every HMR reload.
function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
  const path = raw.replace(/^file:/, "");
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  return path;
}

const globalForDb = globalThis as unknown as { __sqlite?: Database.Database };
const sqlite = globalForDb.__sqlite ?? new Database(resolveDbPath());
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
// Wait (don't throw SQLITE_BUSY) when another connection holds the lock — e.g.
// parallel Next build workers each evaluating a DB-backed route module, or a
// concurrent dev request. Degrades honestly to a short wait instead of a crash.
sqlite.pragma("busy_timeout = 5000");
if (process.env.NODE_ENV !== "production") globalForDb.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });

// Apply committed migrations on startup so the runtime DB always has the current
// schema (idempotent — drizzle's migrator tracks applied migrations). Without
// this, a fresh data/app.db has no tables and every query 500s. Skipped only
// when no migrations directory exists yet (pre-first-migration).
const migrationsFolder = join(process.cwd(), "db", "migrations");
if (existsSync(migrationsFolder)) {
  migrate(db, { migrationsFolder });
}

export type DB = typeof db;
