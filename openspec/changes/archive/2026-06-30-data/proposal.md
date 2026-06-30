## Why

`pipe` proved the runtime, but the bot has no memory. **The database is the memory** (invariant #1):
every fact, total, and review is read from SQL, never reconstructed from chat. Before onboarding,
food logging, metrics, or reviews can land, we need the persistence foundation — the schema, the
migration workflow, a pooled client, and the multi-tenancy filter that every later feature builds
on. This is the M1 milestone; `onboarding`, `router`, `food-text`, `metrics`, and `reviews` are all
`blocked-by: data`.

## What Changes

- Add **Prisma + PostgreSQL** to the stack: `prisma/schema.prisma`, an initial migration, and
  `prisma generate` wired into the build.
- Model the **core 5 tables** per requirements §6 — `users` (keyed on Telegram `chat_id`),
  `food_database`, `food_log`, `body_metrics`, `reviews` — with their enums (`per`, `meal`,
  `source`, `period`). Numeric columns: **integer** kcal, **Prisma `Decimal`** for gram/cm values —
  **never `Float`** (backend-conventions rule 10).
- Multi-tenancy base (invariant #8): every domain row carries `user_id`; a small **service-layer
  helper** scopes every query by `user_id` so the filter can't be forgotten. No Postgres RLS (only
  our backend touches the DB).
- `src/db/` — a **single pooled `PrismaClient`** sized to the box (`max_connections=20`,
  256 MB PG), exported as the one client the app imports.
- Migrations apply via **`prisma migrate deploy` in the container at startup** — never on the host
  (invariant #7, builds are off-box).
- Deferred (NOT here): `open_questions`, `notion_sync`, `notion_config`, `progress_notes` — they land
  with their feature changes (`clarify`, `notion-mirror`, `progress-photo`).

## Capabilities

### New Capabilities
- `data-layer`: the persistence foundation — the core schema (5 tables + enums), the migration
  workflow, the pooled Prisma client, and the `user_id` multi-tenancy filter every domain query
  must pass through.

### Modified Capabilities
- `bot-runtime`: the startup sequence gains a **`prisma migrate deploy`** step and a DB connectivity
  check before the bot serves traffic (the only requirement-level change to the existing spec).

## Impact

- **New deps:** `prisma` (dev/CLI), `@prisma/client` (runtime). `DATABASE_URL` (already validated in
  `config/env`) is now actually used.
- **New code:** `prisma/schema.prisma`, `prisma/migrations/**`, `src/db/client.ts` (pooled
  singleton), `src/db/tenancy.ts` (the `user_id` scoping helper) + tests. `package.json` gains
  `prisma migrate`/`generate` scripts; Dockerfile runtime stage runs `migrate deploy` then `node`.
- **Invariants touched:**
  - #8 **multi-tenancy** — central: `users` keyed on `chat_id`; every domain table has `user_id`;
    the tenancy helper enforces the filter at the service layer.
  - #7 **memory caps + build off-box** — pool capped to `max_connections=20`; `migrate deploy` runs
    in-container at start, never `migrate dev`/`tsc` on the host.
  - #9 **privacy** — no secret stored in the DB; body/progress columns kept access-tight, never
    logged raw.
  - #1 **DB is the memory** — this change creates that memory; later reads/totals come from SQL.
- **Memory/cost:** schema only — negligible app RSS; one pooled connection set. **Zero LLM cost** (no
  model call in this change).
- **Deploy-time (human):** "app reads/writes the DB on the box" is verified at deploy, like `pipe`'s
  round-trip — the local gates author + validate the schema, migration SQL, and tenancy logic.
