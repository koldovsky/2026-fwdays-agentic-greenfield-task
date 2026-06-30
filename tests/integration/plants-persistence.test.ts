// Integration test — persistence across an app restart (NFR-DATA-01 / SC-4).
// The in-memory test DB (test-db helper) dies with the test, so it structurally
// CANNOT prove durability. Here we use a FILE-backed temp SQLite database:
// create a plant, fully close the connection (simulating an app shutdown), then
// reopen a brand-new handle against the SAME file and assert the row survived.
//
// @trace NFR-DATA-01
// (also covers SC-4: "plants persist across reloads and app restarts")
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "@/db/schema";
import { getPlant, insertPlant, listPlants } from "@/lib/plants/queries";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

let dir: string;
let dbFile: string;

/** Open a FRESH file-backed handle (FKs on, migrations applied) — a "restart". */
function openDb() {
  const sqlite = new Database(dbFile);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`no migrations at ${MIGRATIONS_DIR}; run db:generate first`);
  }
  // migrate() is idempotent (Drizzle tracks applied migrations in the file).
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db, sqlite };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "plants-persistence-"));
  dbFile = join(dir, "plants.db");
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("plants persist across an app restart (NFR-DATA-01 / SC-4)", () => {
  it("survives closing and reopening the file-backed database", async () => {
    // Session 1: create a plant, then close the connection (the "shutdown").
    const first = openDb();
    const created = await insertPlant(first.db, {
      name: "Стійка рослина",
      species: SPECIES_DEFAULT,
      acquiredDate: "2024-03-09",
    });
    expect(created.id).toBeGreaterThan(0);
    first.sqlite.close();

    // Session 2: a brand-new handle against the SAME file (the "restart").
    const second = openDb();
    try {
      const survived = await getPlant(second.db, created.id);
      expect(survived?.id).toBe(created.id);
      expect(survived?.name).toBe("Стійка рослина");
      expect(survived?.species).toBe(SPECIES_DEFAULT);
      expect(survived?.acquiredDate).toBe("2024-03-09");
      // And it is still in the list after the restart.
      expect(await listPlants(second.db)).toHaveLength(1);
    } finally {
      second.sqlite.close();
    }
  });
});
