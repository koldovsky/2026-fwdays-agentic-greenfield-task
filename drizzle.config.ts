import { defineConfig } from "drizzle-kit";

// SQLite + Drizzle (ADR-0001). Domain schemas live in db/schema/<domain>.ts,
// re-exported from db/schema/index.ts. Migrations are committed (SQL + meta).
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/app.db",
  },
});
