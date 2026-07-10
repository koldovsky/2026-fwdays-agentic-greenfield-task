# Prisma (api)

Schema and migrations for the api app (TC-STACK-01: Prisma + MySQL). The CLI
config is `prisma.config.ts` at the repo root — run all `npx prisma …`
commands from the workspace root so the root `.env` is picked up.

The baseline migration `0_init` is **intentionally empty** (design D2 of the
`s01-walking-skeleton` change): it exists to create the `_prisma_migrations`
table and prove the migrate pipeline end-to-end (local dev → container
startup `prisma migrate deploy`) without inventing placeholder tables. The
first real models (`user`, `otp_code`, `session`) landed with slice S-02.

The generated client is emitted to `api/src/generated/prisma` (gitignored) —
regenerate with `npx prisma generate`.
