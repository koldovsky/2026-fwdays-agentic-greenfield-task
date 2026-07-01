## 1. Dependency & schema

- [x] 1.1 Add `@notionhq/client` to `package.json` deps; regenerate lockfile (build off-box, invariant #7 — never install on host).
- [x] 1.2 Prisma schema: enums `NotionSourceTable (food_log|food_database|body_metrics|review)`, `NotionSyncStatus (pending|done|failed|dead)`, `NotionAuthType (env|oauth)`; model `NotionSync` (`source_table`, `source_id`, `user_id` FK, `notion_page_id?`, `status`, `attempts`, `last_error?`, `next_attempt_at?`, timestamps; index `(status, next_attempt_at)`); model `NotionConfig` (`user_id @unique` FK, `auth_type`, `credential_ref`, `db_foodlog_id`/`db_reviews_id`/`db_metrics_id`/`db_fooddb_id`, `enabled`). snake_case via `@map` like existing models.
- [x] 1.3 Author the migration via `npm run db:migrate` (commit it; `db:deploy` runs in-container at start). If no local DB in sandbox, author SQL by hand consistent with prior migrations and note the deploy-time verification.

## 2. Outbox (enqueue seam)

- [x] 2.1 `src/notion/types.ts`: `NotionOutbox` interface (`enqueue({ sourceTable, sourceId, userId }): Promise<void>`), narrow Prisma `Pick` client types for outbox/worker/config (backend-conventions explicit-nullable + narrow clients).
- [x] 2.2 `src/notion/outbox.ts`: `createNotionOutbox(client, env)` — inserts a `pending` `notion_sync` row; lazily seeds the owner's `notion_config` (`auth_type = "env"`, `credential_ref = "NOTION_TOKEN"`, DB ids from env, `enabled = true`) on first enqueue when all `NOTION_*` are set; entire enqueue wrapped so any failure is warn-logged (no raw values, invariant #9) and never throws to the caller. Plus `noopOutbox` (mirror off) — same interface, does nothing.

## 3. Mapping & credential resolution

- [x] 3.1 `src/notion/mapper.ts`: one pure function per source table (`food_log`, `food_database`, `body_metrics`, `review`) → Notion `properties` object; explicit return types; English structural values (invariant #6); property names per the owner's ported Notion DBs (real-workspace validation is the deploy-time gate).
- [x] 3.2 `src/notion/resolve.ts`: `resolveNotionTarget(client, env, userId)` → `{ notion, dbIds } | null`; `env` branch builds `new Client({ auth: env.NOTION_TOKEN })`; absent/disabled/`oauth` → `null` (skip). Single seam for future OAuth.

## 4. Worker

- [x] 4.1 `src/notion/worker.ts`: `startNotionWorker(client, env, deps)` — `setInterval` tick (review-scheduler precedent): fetch batch `status IN (pending,failed)` AND (`next_attempt_at` null or ≤ now) ordered by `created_at` (single query, no N+1); process sequentially throttled ~3 req/s; per row: resolve target → look up prior `done` row's `notion_page_id` for `(source_table, source_id)` → create or update page → `done` + store page id. Per-row try/catch: `attempts++`, `last_error` = error message only, `next_attempt_at = now + min(base·2^attempts, cap) + jitter`, `status = failed`; `attempts ≥ MAX` → `dead`. One row's failure never aborts the batch. Injectable Notion client factory + clock for tests. Returns `{ stop(): Promise<void> }` — stop polling, await in-flight row.

## 5. Service & entrypoint wiring

- [x] 5.1 Inject `NotionOutbox` into the writing services (food: create + correction + `addToCatalog`; metrics; reviews) and call `outbox.enqueue(...)` right after each successful mirrored write (service layer, not `write.ts`). `progress_notes` is NOT mirrored. Default the dep to `noopOutbox` so existing tests/constructors stay valid.
- [x] 5.2 `src/index.ts main()`: construct real outbox when `env.NOTION_TOKEN` set, else `noopOutbox`; pass into services; start the worker only when `NOTION_TOKEN` set; await `worker.stop()` in `registerShutdown` (alongside bot/health). Bot must boot with zero `NOTION_*` set.

## 6. Tests (test/ mirrors src/, vitest, fake Prisma + fake Notion client)

- [x] 6.1 `test/notion/outbox.test.ts`: enqueue writes `pending` row with correct `source_table`/`source_id`/`user_id` (invariant #8); throwing outbox client is swallowed + logged (reply-safe); owner config lazily seeded once; `noopOutbox` writes nothing.
- [x] 6.2 `test/notion/worker.test.ts`: pending → page created → `done` + `notion_page_id`; correction with prior `done` row → update (no duplicate page); rate-limit ≤ ~3 req/s (injected clock); failure → `failed` + backoff `next_attempt_at` + `last_error` has message only (no raw values, invariant #9); `attempts ≥ MAX` → `dead`, never re-picked; one bad row doesn't abort the batch; disabled/missing/oauth config → skip, no Notion call.
- [x] 6.3 `test/notion/resolve.test.ts`: `env` branch → client + 4 DB ids, token never persisted; missing/disabled/`oauth` → `null`.
- [x] 6.4 `test/notion/mapper.test.ts`: per-table property-shape assertions; English structural values.
- [x] 6.5 Service tests: mirrored writes enqueue (food create/correct/catalog, metrics, reviews); reply/confirmation identical when enqueue throws; verify mocks honor the tenant filter (mocks-can-mask trap).
- [x] 6.6 Boot: suites green with no `NOTION_*` env set (mirror off end-to-end).

## 7. Evals & docs

- [x] 7.1 Eval gate: the mirror makes zero LLM calls → no capability suite touched; log the skip per ADR-0013. Real Notion round-trip is the deploy-time gate (no token in sandbox) — note it in current-state.
- [x] 7.2 Write **ADR-0022** (outbox + in-process poll worker: post-write vs transactional, poll vs LISTEN/NOTIFY, in-process vs separate process; per-user config shaped for OAuth) + update `docs/adr/README.md` index.
- [x] 7.3 Docs sync: `docs/current-state.md` (M7 flip, date); AGENTS.md — Notion mirror planned→live bits (env table note, structure); grep `docs/**/*.md` for touched symbols/env; PRD/requirements §11 if any open question resolved. Run `npm run docs:check`.

## 8. Gates & review

- [x] 8.1 Run `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` — all green. (345 tests / 51 files; 1 pre-existing lint warning in `src/router/schema.ts`.)
- [x] 8.2 Step-7 duplication gate: cross-reference the diff's new symbols against all of `src/` (backoff math, narrow client types, date/clock helpers, logger patterns) — zero new copies; reuse existing enums/utils. (3 violations found + fixed: `errorMessage` twins repointed, `nullableNumber` → `src/util/num.ts`, `systemNow` → `src/util/date.ts`.)
- [x] 8.3 **Maker ≠ checker**: hand the full diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes). Resolve every finding before commit; no self-approval. — Checker: 1 MAJOR (stop-after-row) + 1 MINOR (last_error bound) + 2 NITs, all fixed → re-review CONFIRMED-FIXED, clean on both axes.
