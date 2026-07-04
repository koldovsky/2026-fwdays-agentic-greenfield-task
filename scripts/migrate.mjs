// Forward-only migration runner for a REAL Postgres (prod/staging). Same
// semantics as src/shared/lib/db/migrate.ts and scripts/dev-pglite-server.mjs:
// applies each src/shared/lib/db/migrations/NNNN_*.sql once, tracked in a
// schema_migrations table, so re-runs are idempotent. Deploy has no automatic
// migrate step, so this is run manually (or from CI) against the target DB.
//
// Usage (never commit the URL — pass it via env only):
//   DATABASE_URL="postgres://user:pass@host/db?sslmode=require" yarn db:migrate
//
// SSL: honored via the connection string. Managed Postgres (Neon / Vercel
// Postgres / Supabase) requires TLS — include `?sslmode=require` in the URL and
// pg negotiates SSL against the host's public CA (no extra config needed).
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(here, "../src/shared/lib/db/migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Point it at the target Postgres and re-run.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );

  const { rows } = await pool.query(`SELECT name FROM schema_migrations`);
  const done = new Set(rows.map((r) => r.name));

  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS, file), "utf8");
    // Each file runs in its own transaction: a mid-file failure rolls back so
    // schema_migrations never records a half-applied migration.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw new Error(`migration ${file} failed: ${error.message}`, { cause: error });
    } finally {
      client.release();
    }
    applied.push(file);
    console.log("applied", file);
  }

  console.log(applied.length > 0 ? `done (${applied.length} applied)` : "already up to date");
} finally {
  await pool.end();
}
