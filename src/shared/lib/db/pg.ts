// node-postgres adapter for the Queryable port. Server-only. Imported directly
// (not via the db barrel) so `pg` never enters a client bundle. Chosen for its
// near-1:1 fit with the port: a thin passthrough, no ORM, SQL stays explicit.
import { Pool } from "pg";
import { getDatabaseSsl, getDatabaseUrl } from "@/shared/config";
import type { Queryable } from "./port";

/**
 * Error codes for a connection that died out from under us (as opposed to a
 * query/constraint error). A pooled TCP socket idled long enough that the server
 * (or an intermediary) closed it, so the first statement on that checked-out
 * client fails at the socket layer. These are safe to retry once on a fresh
 * connection; a query error (syntax, constraint, IDOR-guarded cast) is not.
 *   ECONNRESET/EPIPE/ETIMEDOUT — socket-level; 08xxx — PG connection-exception;
 *   57P01 — admin_shutdown (server closed the backend).
 */
const RETRYABLE_CONNECTION_ERRORS = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "08000",
  "08003",
  "08006",
  "57P01",
]);

function isRetryableConnectionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && RETRYABLE_CONNECTION_ERRORS.has(code);
}

/** Wrap a pg Pool (or any pool-like) as a {@link Queryable}. */
export function createPgQueryable(pool: Pool): Queryable {
  async function run<Row>(sql: string, params?: readonly unknown[]) {
    const result = await pool.query<Row extends object ? Row : never>(
      sql,
      params ? [...params] : undefined,
    );
    return { rows: result.rows };
  }
  return {
    async query<Row>(sql: string, params?: readonly unknown[]) {
      try {
        return await run<Row>(sql, params);
      } catch (error) {
        // Self-heal a stale-connection reset: the pool evicts the dead client
        // and hands us a fresh one on retry. Only retry connection-level errors,
        // and only once (a persistent outage must still surface, not spin).
        if (!isRetryableConnectionError(error)) throw error;
        return await run<Row>(sql, params);
      }
    },
  };
}

let pool: Pool | undefined;

/** Lazily-created shared connection pool from `DATABASE_URL`. */
export function getPool(): Pool {
  if (pool === undefined) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      // Managed Postgres requires TLS (see getDatabaseSsl); dev pglite does not.
      ssl: getDatabaseSsl(),
      // Keep sockets warm and evict our own idle clients before the server's
      // idle timeout does, so we never hand a serverless-killed socket to a
      // query (the root cause of `read ECONNRESET`).
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      max: 10,
    });
    // A client that errors while idle emits `error` on the pool. With no
    // listener Node treats it as an unhandled exception and crashes the process
    // — even though the route's own try/catch is intact. Log and let the pool
    // discard the dead client (NFR-OBS-01; no secrets in the line).
    pool.on("error", (error) => {
      console.error("[db] idle client error", error);
    });
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
