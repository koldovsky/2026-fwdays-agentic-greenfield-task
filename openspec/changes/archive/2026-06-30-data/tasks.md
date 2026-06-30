## 1. Dependencies & Prisma setup

- [x] 1.1 Added `@prisma/client` + `prisma` (both runtime — `prisma` needed for in-container
  `migrate deploy`); `prisma/schema.prisma` with `postgresql` datasource (`DATABASE_URL`) + client
  generator.
- [x] 1.2 Scripts `db:generate` / `db:migrate` / `db:deploy`; documented in AGENTS.md Commands
  (docs:check green). Client generated for typecheck/build.

## 2. Schema (core 5 tables)

- [x] 2.1 `users` (id, `chat_id` BigInt unique, profile, tz default, `target_kcal` Int,
  `target_*_g` Decimal, created_at).
- [x] 2.2 `food_database` (id, name, `per` enum, kcal Int, macros Decimal, user_id nullable=global,
  created_by, created_at).
- [x] 2.3 `food_log` (id, user_id, date `@db.Date`, `meal` enum, entry_name, qty Decimal, unit,
  kcal Int, macros Decimal, `source` enum, food_db_id nullable FK, created_at).
- [x] 2.4 `body_metrics` (id, user_id, date `@db.Date`, weight/measurements Decimal nullable,
  conditions, created_at).
- [x] 2.5 `reviews` (id, user_id, `period` enum, period_start/_end `@db.Date`, body, reviewed_flag,
  created_at). Enums English; **no `Float`** anywhere (verified in migration SQL).

## 3. Migration

- [x] 3.1 Initial migration generated via `prisma migrate diff --from-empty --to-schema-datamodel
  --script` → `prisma/migrations/<ts>_init/migration.sql` (+ `migration_lock.toml`). `prisma
  validate` passes. Committed with the schema.

## 4. Client & multi-tenancy

- [x] 4.1 `src/db/client.ts`: single pooled `PrismaClient` singleton (dev hot-reload guard);
  exported as the one client modules import.
- [x] 4.2 `src/db/tenancy.ts`: `tenantWhere` injects `user_id`; `catalogWhere` widens reads to
  `user_id IN (me, null)`. Single choke-point so the filter can't be omitted.

## 5. Startup integration (bot-runtime delta)

- [x] 5.1 Dockerfile: COPY `prisma/` + `prisma generate` in both stages; start command runs
  `prisma migrate deploy` then `node dist/index.js`. `prisma` present in runtime image; no
  build/migrate on host (invariant #7).
- [x] 5.2 `src/index.ts`: `connectDbOrExit()` (`prisma.$connect()`) runs before `bot.start()`; on
  failure logs + `process.exit(1)`. `$disconnect()` added to graceful shutdown.

## 6. Verification (tests for touched invariants)

- [x] 6.1 Test (#8 multi-tenancy): `tenantWhere` injects `userId` and a smuggled foreign `userId`
  cannot widen scope; `catalogWhere` adds the global-OR. (`src/db/tenancy.test.ts`)
- [x] 6.2 `users.chat_id` uniqueness + `food_database.user_id` nullable verified in the migration SQL
  (`CREATE UNIQUE INDEX users_chat_id_key`; nullable `user_id`); client delegates asserted in
  `src/db/client.test.ts`.
- [x] 6.3 Privacy (#9) verified by inspection: schema stores no token/secret column; no body-metric
  read/write/log code exists yet in this change (service layer lands with `metrics`).
- [x] 6.4 Local gates green: `prisma validate`, lint, format:check, typecheck, test (15 passing),
  build, docs:check. (Fallow still deferred — ADR-0011.)
- [ ] 6.5 **Deploy-time (human):** container start runs `migrate deploy` on the capped Postgres,
  `$connect()` succeeds, a read/write round-trips on the box (invariant #1 acceptance). Cannot be
  done in-session.

## 7. Review (maker ≠ checker)

- [x] 7.1 Handed the diff to SEPARATE reviewer subagents (Standards + Spec, parallel, fresh). No
  HARD violations / no scope creep. Resolved: pool now pinned (`connection_limit=5`, invariant #7);
  `catalogWhere` nested under `AND` so a caller's `OR` isn't clobbered (+ test); softened the
  tenancy choke-point comment (convention, not structural); `created_by` disambiguated in schema.
  Re-ran gates green.
