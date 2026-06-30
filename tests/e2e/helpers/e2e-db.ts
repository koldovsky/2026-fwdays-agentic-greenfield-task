// E2E DB access (Phase 5). Opens a SHORT-LIVED Drizzle handle on the SAME SQLite
// file the built `next start` server reads (E2E_DATABASE_URL / data/e2e.db),
// applies the committed migrations, re-pins the deterministic demo baseline, and
// CLOSES the handle again. Used by global-setup (once, before the server boots)
// and by each spec's beforeEach (so a mutating spec — water-now, add/delete —
// always starts from the known fixture regardless of run order).
//
// Crucially we DO NOT keep the connection open: a long-lived writer connection
// holds the SQLite lock and makes the `next build` page-data collection (which
// opens its own connection + runs migrations) fail with SQLITE_BUSY. Opening,
// committing, and closing per call keeps the lock window tiny.
//
// We open our OWN better-sqlite3 handle here instead of importing @/db/client so
// we don't depend on DATABASE_URL being set before that module's import-time
// singleton initialises. The server process gets the URL via the webServer env.
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "@/db/schema";
import { seedDemoData } from "@/tests/helpers/seed-demo-data";

export const E2E_DB_URL = process.env.E2E_DATABASE_URL ?? "file:./data/e2e.db";

function resolveE2ePath(): string {
  const raw = E2E_DB_URL.replace(/^file:/, "");
  if (raw !== ":memory:") mkdirSync(dirname(raw), { recursive: true });
  return raw;
}

function openDb() {
  const sqlite = new Database(resolveE2ePath());
  // Match the server's WAL mode so both connections share one WAL; committed
  // writes from this process are visible to the server's next read transaction.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

/** Apply committed migrations to the E2E DB file (idempotent), then close. */
export function migrateE2eDb(): void {
  const folder = join(process.cwd(), "db", "migrations");
  if (!existsSync(folder)) {
    throw new Error(`e2e-db: no migrations at ${folder}; run db:generate first.`);
  }
  const sqlite = openDb();
  try {
    migrate(drizzle(sqlite, { schema }), { migrationsFolder: folder });
  } finally {
    sqlite.close();
  }
}

/**
 * Re-pin the deterministic demo baseline; returns the created plant ids. Opens a
 * short-lived connection, seeds, checkpoints the WAL into the main file (so the
 * server's next read sees the rows), and closes — holding no lasting lock.
 */
export async function reseed() {
  const sqlite = openDb();
  try {
    const db = drizzle(sqlite, { schema });
    const ids = await seedDemoData(db);
    // Flush committed writes from the WAL into the main DB file so the server's
    // separate connection sees the fresh rows on its next read transaction.
    sqlite.pragma("wal_checkpoint(PASSIVE)");
    return ids;
  } finally {
    sqlite.close();
  }
}
