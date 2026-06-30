// Test DB helper — a FRESH SQLite database per test (design D7 smoke flow).
//
// Each call opens a brand-new in-memory better-sqlite3 connection, enables
// `PRAGMA foreign_keys = ON` (so ON DELETE CASCADE is actually enforced — D5),
// and applies the committed Drizzle migrations from db/migrations/ if present.
// In-memory gives perfect isolation: no shared state, no manual-tester drift,
// nothing to clean up — the connection dies with the test.
//
// Imports db/schema (which re-exports db/schema/plants.ts). Until that schema
// exists this import fails RED, which is the intended Phase 4b state.
import { existsSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "@/db/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>> & {
  __raw: Database.Database;
};

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

/**
 * Build a fresh, isolated in-memory database with the plants schema applied and
 * foreign keys enforced. Caller may `db.__raw.close()` when done (optional for
 * `:memory:` — the handle is GC'd with the test).
 */
export function makeTestDb(): TestDb {
  const sqlite = new Database(":memory:");
  // Enforce cascade FKs (D5). SQLite has FK enforcement OFF by default.
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema }) as TestDb;

  // Prefer the committed migration artifacts (D7) when they exist so the test
  // exercises the SAME DDL that ships. If migrations are not generated yet, the
  // schema is not buildable from SQL — surface that loudly rather than silently
  // testing nothing.
  if (existsSync(MIGRATIONS_DIR)) {
    migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  } else {
    throw new Error(
      `makeTestDb: no migrations at ${MIGRATIONS_DIR}; run \`npm run db:generate\` first (D7).`,
    );
  }

  Object.defineProperty(db, "__raw", { value: sqlite, enumerable: false });
  return db;
}
