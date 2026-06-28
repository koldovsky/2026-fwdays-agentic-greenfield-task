import { defineConfig } from "prisma/config";

// The Prisma CLI auto-loads `.env` but not `.env.local`, where the direct
// (non-pooled) DIRECT_URL lives. Load both so migrations use the direct Neon
// endpoint, not the pooler. `.env.local` wins (loaded last); both are optional,
// so a missing file is ignored (offline `validate`/`generate` still work).
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file absent — fine
  }
}

// Prisma 7 moves connection URLs out of schema.prisma. The CLI (migrate,
// introspect) uses a direct connection; the runtime client uses a pooled
// connection via the driver adapter in lib/db/. No live DB is provisioned in
// the foundation slice, so the migration URL is read straight from the
// environment (documented in .env.example) and is simply absent here until a
// managed Postgres is configured — keeping offline `validate`/`generate` green.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` runs the idempotent template seeder (FR-TPL-01). It
    // upserts the seeded read-only templates; safe to re-run, never deletes.
    seed: "node scripts/seed-templates.mts",
  },
  datasource: {
    // Direct connection for migrations (DIRECT_URL); falls back to the pooled
    // URL. Left undefined when neither is set, which is fine for non-DB commands.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
