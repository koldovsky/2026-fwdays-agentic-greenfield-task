// Phase-6 demo-DB seeder. Migrates + re-pins the deterministic demo baseline
// into the DEDICATED recording SQLite file (DEMO_DATABASE_URL, default
// data/demo.db) so the recording harness drives a known dataset and NEVER
// touches the developer's data/app.db (its own file) or the E2E data/e2e.db.
//
// It reuses the SAME committed migrations and the SAME seed fixture as the E2E
// layer (tests/helpers/seed-demo-data.ts) — one source of seeded state. We open
// our own short-lived better-sqlite3 handle (open -> migrate -> seed ->
// checkpoint -> close) so no lasting writer lock survives to block the `next
// start` server that reads the same file.
//
// Run standalone: `node --import tsx scripts/seed-demo-db.mjs`
// (the recording harness invokes it before it boots the server).
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "@/db/schema";
import { plants } from "@/db/schema/plants";
import { seedDemoData } from "@/tests/helpers/seed-demo-data";

export const DEMO_DB_URL =
  process.env.DEMO_DATABASE_URL ?? "file:./data/demo.db";

function resolveDemoPath() {
  const raw = DEMO_DB_URL.replace(/^file:/, "");
  if (raw !== ":memory:") mkdirSync(dirname(raw), { recursive: true });
  return raw;
}

function openDb() {
  const sqlite = new Database(resolveDemoPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

export async function seedDemoDb() {
  const folder = join(process.cwd(), "db", "migrations");
  if (!existsSync(folder)) {
    throw new Error(
      `seed-demo-db: no migrations at ${folder}; run db:generate first.`,
    );
  }
  const sqlite = openDb();
  try {
    migrate(drizzle(sqlite, { schema }), { migrationsFolder: folder });
    const db = drizzle(sqlite, { schema });
    // The recording DB is EXCLUSIVELY the harness's, so wipe ALL plants first
    // (cascade clears their measurements/waterings) before re-pinning the demo
    // fixture. This drops any bespoke plant a prior plant-crud clip created, so
    // each run starts from EXACTLY the 4 deterministic demo plants — the
    // reminder-home due count is then a stable 3 and the stills stay clean.
    await db.delete(plants).run();
    const ids = await seedDemoData(db);
    sqlite.pragma("wal_checkpoint(PASSIVE)");
    return ids;
  } finally {
    sqlite.close();
  }
}

// Allow running as a script (the harness shells out to it via tsx).
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoDb()
    .then((ids) => {
      console.log(
        `[demo] seeded ${DEMO_DB_URL} — overdue=${ids.overdue} soon=${ids.soon} healthy=${ids.healthy} never=${ids.never}`,
      );
    })
    .catch((e) => {
      console.error(e.message ?? e);
      process.exit(1);
    });
}
