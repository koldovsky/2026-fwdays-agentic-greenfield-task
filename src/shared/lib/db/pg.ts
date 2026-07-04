// node-postgres adapter for the Queryable port. Server-only. Imported directly
// (not via the db barrel) so `pg` never enters a client bundle. Chosen for its
// near-1:1 fit with the port: a thin passthrough, no ORM, SQL stays explicit.
import { Pool } from "pg";
import { getDatabaseUrl } from "@/shared/config";
import type { Queryable } from "./port";

/** Wrap a pg Pool (or any pool-like) as a {@link Queryable}. */
export function createPgQueryable(pool: Pool): Queryable {
  return {
    async query<Row>(sql: string, params?: readonly unknown[]) {
      const result = await pool.query<Row extends object ? Row : never>(
        sql,
        params ? [...params] : undefined,
      );
      return { rows: result.rows };
    },
  };
}

let pool: Pool | undefined;

/** Lazily-created shared connection pool from `DATABASE_URL`. */
export function getPool(): Pool {
  if (pool === undefined) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return pool;
}

/** The app's default Queryable, backed by the shared pool. */
export function getDb(): Queryable {
  return createPgQueryable(getPool());
}

/**
 * Run `fn` inside a single transaction: all queries on the tx-scoped Queryable
 * hit one checked-out client wrapped in BEGIN/COMMIT, and any throw triggers a
 * ROLLBACK so a multi-statement write is all-or-nothing. Used for repo `save`
 * paths that insert a parent row plus children (the repo docs require a
 * tx-scoped Queryable — a pool-backed one autocommits each statement on a
 * possibly different connection, which can leave partial rows on a mid-write
 * error).
 */
export async function withTransaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const tx: Queryable = {
    async query<Row>(sql: string, params?: readonly unknown[]) {
      const result = await client.query<Row extends object ? Row : never>(
        sql,
        params ? [...params] : undefined,
      );
      return { rows: result.rows };
    },
  };
  try {
    await client.query("BEGIN");
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Best-effort rollback; surface the original error below.
    }
    throw error;
  } finally {
    client.release();
  }
}
