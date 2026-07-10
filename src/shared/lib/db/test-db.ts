// Test-only database factory (the DB-integration test seam). Server/test-only —
// imports `pg` and `@electric-sql/pglite`, so never pull this into app or client
// code (the app uses getDb()/getPool() in pg.ts instead).
//
// WHY: every DB-integration test used to hard-code `new PGlite()` in-process, so
// the repos were NEVER exercised against a real Postgres — real-engine semantics
// (the atomic usage-counter reserve's `ON CONFLICT … WHERE … RETURNING`, the
// status-race guarded `UPDATE … RETURNING`, `findExportGrant`'s ordering, real
// `BEGIN/COMMIT/ROLLBACK`) went unverified (NFR-COST-02, BC-HONESTY-02, NFR-SEC-04,
// TC-STACK-05). This factory is the single seam that fixes it:
//   - default (no env)          → in-process PGlite, zero infra, the historical
//                                 behavior; `yarn test` needs no DB running.
//   - TEST_DATABASE_URL set     → a real node-postgres Pool against that Postgres,
//                                 each test file isolated in its own throwaway
//                                 schema so parallel files never collide, dropped
//                                 on close.
// Both backends satisfy the `Queryable` port, so `runMigrations(db)` and every
// `createXRepo(db)` run unchanged on either.
import { randomBytes } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

import { createPgQueryable } from "./pg";
import type { Queryable } from "./port";

export interface TestDb {
  /** The Queryable to pass to runMigrations() and createXRepo(). */
  readonly db: Queryable;
  /** Tear down: drop the isolated schema (real PG) and close the connection. */
  close(): Promise<void>;
}

/** Wrap an in-process PGlite instance as a {@link Queryable} (default backend). */
function pgliteAdapter(pg: PGlite): Queryable {
  return {
    async query<Row>(sql: string, params?: readonly unknown[]) {
      const res = await pg.query<Row>(sql, params ? [...params] : undefined);
      return { rows: res.rows };
    },
  };
}

/** A unique, SQL-safe schema name so parallel test files never share tables. */
function uniqueSchema(): string {
  return `test_${randomBytes(8).toString("hex")}`;
}

/**
 * Build an isolated DB for one integration-test file. Call once per file in
 * `beforeAll` and `close()` in `afterAll`. When `TEST_DATABASE_URL` is set the
 * tests exercise a REAL Postgres (point it at a dedicated/ephemeral instance in
 * CI to catch PGlite-vs-Postgres divergence); otherwise they run on in-process
 * PGlite exactly as before.
 */
export async function makeTestDb(): Promise<TestDb> {
  const url = process.env.TEST_DATABASE_URL;
  if (url === undefined || url === "") {
    const pg = new PGlite();
    return { db: pgliteAdapter(pg), close: () => pg.close() };
  }

  // Real Postgres: give this file its own schema and route every pooled
  // connection into it via the startup `options` packet, so migrations and repo
  // writes stay isolated from other test files sharing the same database.
  const schema = uniqueSchema();
  const pool = new Pool({
    connectionString: url,
    ssl: false,
    max: 4,
    options: `-c search_path=${schema}`,
  });
  // CREATE SCHEMA resolves by name (not search_path), so it works even though the
  // schema does not exist yet when the first connection sets search_path to it.
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

  return {
    db: createPgQueryable(pool),
    async close() {
      // Swallow-and-warn the drop: teardown must never redden an otherwise-green
      // run. The schema is a throwaway on an ephemeral/dedicated test DB, so a
      // rare leaked schema is harmless; a thrown DROP in afterAll would not be.
      try {
        await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } catch (error) {
        console.warn(`[test-db] failed to drop schema ${schema}`, error);
      } finally {
        await pool.end();
      }
    },
  };
}
