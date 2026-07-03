import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const isLocal = connectionString.includes('sslmode=disable') || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  return new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// In serverless environments, module-level variables are persisted between executions
// within the same execution container. Reusing the pool prevents exhausting DB connections.
if (!globalForDb.pool) {
  globalForDb.pool = createPool();
}

export const pool = globalForDb.pool;
export const db = drizzle(pool, { schema });
