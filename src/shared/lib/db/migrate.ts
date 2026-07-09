// Minimal forward-only migration runner over the Queryable port. Driver-portable:
// splits each .sql script into single statements and runs them one-by-one (the
// port speaks single, parameterized statements), tracking applied files in a
// schema_migrations table so re-runs are idempotent.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Queryable } from "./port";

export interface Migration {
  readonly name: string;
  readonly sql: string;
}

/** Directory holding the ordered `NNNN_*.sql` migration files. */
export const MIGRATIONS_DIR = join(import.meta.dirname, "migrations");

/** Read migrations from disk, ordered by filename (server/ops use only). */
export function loadMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), "utf8") }));
}

/**
 * Split a SQL script into individual statements. Line comments are stripped
 * first (a `;` can appear inside a comment); our DDL has no `;` inside string
 * literals, so a plain split on `;` is safe.
 */
function statements(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Apply any not-yet-applied migrations in order. Returns the names applied this
 * run (empty when already up to date).
 */
export async function runMigrations(
  db: Queryable,
  migrations: Migration[] = loadMigrations(),
): Promise<string[]> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await db.query<{ name: string }>(`SELECT name FROM schema_migrations`);
  const done = new Set(rows.map((r) => r.name));

  const applied: string[] = [];
  for (const migration of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    if (done.has(migration.name)) continue;
    for (const statement of statements(migration.sql)) {
      await db.query(statement);
    }
    await db.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [migration.name]);
    applied.push(migration.name);
  }
  return applied;
}
