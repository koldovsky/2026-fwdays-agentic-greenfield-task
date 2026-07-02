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
