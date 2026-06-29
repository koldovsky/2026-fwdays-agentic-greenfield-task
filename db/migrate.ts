import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
const path = raw.replace(/^file:/, "");
const folder = "db/migrations";

if (!existsSync(folder)) {
  console.log(`db:migrate — no migrations yet at ${folder}; nothing to apply.`);
  process.exit(0);
}
if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

const sqlite = new Database(path);
sqlite.pragma("foreign_keys = ON");
migrate(drizzle(sqlite), { migrationsFolder: folder });
console.log("db:migrate — migrations applied.");
