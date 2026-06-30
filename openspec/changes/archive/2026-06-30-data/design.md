## Context

`pipe` landed the runtime; `data` gives it memory. Invariant #1 ("the DB is the memory") makes this
the load-bearing change every feature reads through. The stack already chose **Prisma + PostgreSQL**
(requirements §6); the Postgres resource is provisioned, capped at 256 MB, tuned
(`max_connections=20`, `shared_buffers=64MB`). Constraints: builds are off-box (invariant #7), the
pool must fit `max_connections`, body/progress data is privacy-sensitive (#9), and the migration
workflow is fixed by backend-conventions rule 10 (migrations only; `migrate deploy` in-container).

## Goals / Non-Goals

**Goals:**
- `prisma/schema.prisma` with the core 5 tables + enums (§6), correct numeric types.
- An initial migration committed; `migrate deploy` applied in-container at startup.
- A single pooled `PrismaClient` singleton (`src/db/client.ts`).
- A `user_id` tenancy helper (`src/db/tenancy.ts`) every domain query passes through (invariant #8).
- Tests: tenancy scoping (mocked client), schema/enum shape.

**Non-Goals:**
- No domain services yet (onboarding writes, food logging, reviews are their own changes) — this
  change ships the schema + plumbing, not feature queries.
- The deferred §6 tables (`open_questions`, `notion_*`, `progress_notes`) — they arrive with their
  features.
- No live-box read/write proof here (deploy-time/human, like `pipe`).
- No RLS — only our backend touches the DB; tenancy is enforced in the service layer.

## Decisions

- **Numeric types (backend-conventions rule 10):** `kcal` → `Int`; gram/cm values (`protein_g`,
  `fat_g`, `carbs_g`, `weight_kg`, `*_cm`) → Prisma `Decimal` (`@db.Decimal(p,s)`); **never `Float`**
  — float drift would corrupt the SUM-based totals (invariant #2). `food_log.date` and the review
  period bounds use `@db.Date` (calendar date in the user's TZ), so later "вчера" back-dating writes
  the right day, not a timestamp.
- **Multi-tenancy as a helper, not RLS:** a small `tenancy.ts` exposes a `forUser(userId)`-style
  scoping helper (and/or a thin wrapper) that injects `user_id` into every `where`. Rationale: only
  our backend connects, so RLS is overhead; a single choke-point helper makes "every domain row is
  filtered by `user_id`" testable and hard to forget. `food_database.user_id` is nullable (global
  catalog) — the helper treats `user_id IN (me, null)` for catalog reads.
- **Single pooled client:** `client.ts` constructs one `PrismaClient` and exports it; modules import
  the singleton (guard against hot-reload duplicate instances in `dev`). Pool stays within
  `max_connections=20` — the bot needs only a few.
- **Migrate at container start, off-box:** the runtime image includes `prisma` (promoted to a
  runtime dep) + the `prisma/` dir; the container start runs `prisma migrate deploy` **then**
  `node dist/index.js`. `index.ts` calls `prisma.$connect()` early as the connectivity check —
  failure exits non-zero before `bot.start()` (bot-runtime delta). No `migrate dev`/`db push`/`tsc`
  on the host (invariant #7). This is rule 10 step 5, not a new architectural decision — no ADR.
- **Authoring the migration without a live DB:** generate the initial migration SQL with
  `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` (no DB
  needed), placed under `prisma/migrations/<ts>_init/`. If a local/throwaway Postgres is available,
  `prisma migrate dev --name init` is equivalent; either way the SQL is committed and `migrate
  deploy` applies it on the box.

**No LLM call in this change** — schema + plumbing only; nothing to cache, no agent loop.

## Risks / Trade-offs

- **[Migration authored offline could drift from a real DB]** → it is plain DDL validated by
  `prisma validate` + `prisma migrate diff` (deterministic); the deploy-time `migrate deploy` is the
  real apply. Low risk for an initial create.
- **[`prisma` in the runtime image adds size]** → needed for in-container `migrate deploy`; the
  Prisma engine is already pulled by `@prisma/client`, so the marginal cost is small and within the
  512 MB bot cap. Accepted (standard Prisma-in-container pattern).
- **[`Decimal` ergonomics]** → Prisma returns `Decimal.js` objects; downstream macro math must use
  Decimal arithmetic, not JS `+`. Flagged for the food/reviews changes; not exercised here.
- **[Tenancy helper can be bypassed by a raw query]** → mitigated by making the helper the imported
  default and covering it with a test; the `review` gate watches for direct unscoped `where` use.

## Migration Plan

1. Add `prisma` + `@prisma/client`; `schema.prisma` + generate the init migration; `prisma generate`.
2. Local gates: `prisma validate`, typecheck, tenancy tests, lint/format.
3. Dockerfile runtime stage: COPY `prisma/`, run `migrate deploy` then `node` at start.
4. On deploy (human, M0/M1 boundary): container starts → `migrate deploy` creates tables on the
   capped Postgres → `$connect()` succeeds → bot serves. Verify a read/write round-trips.
- **Rollback:** migrations are forward-only here (initial create); redeploy the prior image to revert
  app code. For a bad migration, a follow-up corrective migration (never edit a shipped one).

## Open Questions

- Decimal precision/scale per column (e.g. `Decimal(6,2)` for grams) — picked sensibly in the schema;
  revisit if a real value overflows. Not blocking.
