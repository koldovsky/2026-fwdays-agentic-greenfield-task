// Dev-only Postgres stand-in: serves an in-process pglite over TCP so the app's
// pg Pool can connect through DATABASE_URL without a local Postgres install.
// Applies src/shared/lib/db/migrations on boot (same forward-only semantics as
// migrate.ts). Usage:
//   node scripts/dev-pglite-server.mjs            # port 5544
//   DATABASE_URL=postgres://any@127.0.0.1:5544/postgres yarn dev|start
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(here, "../src/shared/lib/db/migrations");
const PORT = Number(process.env.PGLITE_PORT ?? 5544);

const db = new PGlite();
await db.waitReady;

await db.exec(
  `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
);
const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  const { rows } = await db.query(`SELECT 1 FROM schema_migrations WHERE name = $1`, [f]);
  if (rows.length > 0) continue;
  await db.exec(await readFile(join(MIGRATIONS, f), "utf8"));
  await db.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [f]);
  console.log("applied", f);
}

const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });
await server.start();
console.log(`pglite listening on ${PORT}`);
