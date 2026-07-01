## Context

US-10 / requirements §9: mirror the owner's Postgres writes into their own Notion workspace,
**async and best-effort** — Notion must never block the reply and a Notion failure must never lose
data (Postgres is the source of truth, invariant #1). Only the owner exists today (single-user,
`env`-token auth); the schema must be shaped so future per-user OAuth slots in without touching any
write path. The repo already has: all five `NOTION_*` env vars declared optional
(`src/config/env.ts`), a background-loop precedent (`src/reviews/scheduler.ts` — hourly tick, per-user
try/catch, no global abort), a graceful-shutdown registrar (`src/index.ts`), and a singleton
`PrismaClient`. No outbox table, no retry/backoff util, no `@notionhq/client` dep yet.

## Goals / Non-Goals

**Goals:**
- Every mirrored Postgres write reliably enqueues a mirror job; the worker eventually writes it or
  marks it `dead`, never silently dropping data.
- Notion I/O is fully off the reply path — the user is confirmed the instant Postgres succeeds.
- One future-shaped `notion_config` so OAuth is a new `auth_type` branch, not a write-path change.
- Boots and passes all suites with **no** `NOTION_*` set (mirror simply off).

**Non-Goals:**
- No OAuth flow (v1 is `env`-only; the `oauth` branch is declared but unimplemented → skips).
- No mirroring of `progress_notes` (no Notion DB for it) and no read-back from Notion (it's a mirror).
- No transactional 2-phase outbox (see the enqueue decision) and no LISTEN/NOTIFY (see worker).
- No real-Notion integration test in the loop (deploy-time; the sandbox has no token).

## Decisions

- **Outbox table `notion_sync`.** Columns per §9: `source_table` (enum
  `food_log|food_database|body_metrics|review`), `source_id`, `user_id`, `notion_page_id?`, `status`
  (enum `pending|done|failed|dead`), `attempts`, `last_error?`, `next_attempt_at?`, `created_at`,
  `updated_at`; index `(status, next_attempt_at)` for the poll query. Idempotency key = `(source_table,
  source_id)`: the worker looks up any prior `done` row's `notion_page_id` to decide create-vs-update,
  so a `food_log` correction patches the existing page rather than duplicating.

- **Config table `notion_config`.** `user_id @unique` (FK `users`), `auth_type` (enum `env|oauth`),
  `credential_ref` (the env var *name* e.g. `"NOTION_TOKEN"`, never the secret — invariant #9),
  `db_foodlog_id`/`db_reviews_id`/`db_metrics_id`/`db_fooddb_id`, `enabled`. v1 seeds one `env` row for
  the owner lazily on first enqueue (single-user ⇒ the writer is the owner).

- **Enqueue = post-write in the service layer, best-effort, NOT transactional.** The four mirrored
  writes already return the created row (with its id); the service calls a shared
  `outbox.enqueue({ sourceTable, sourceId, userId })` right after. Rationale: Postgres is the truth and
  the mirror is explicitly best-effort, so the negligible crash-window between commit and enqueue loses
  no *data* (the row is safe in PG) — only a mirror job, recoverable by a later reconciliation sweep if
  ever needed. A transactional outbox would force `$transaction` into every narrow-`Pick` service
  client (which don't expose `$transaction`), widening types across the write layer for no
  data-safety gain. Enqueue is wrapped so its own failure is logged and never propagates to the reply.
  The outbox is **injected** (constructor dep), so mirror-off is a no-op and the services stay
  decoupled from the Notion tables.

- **In-process poll worker, not a separate process or LISTEN/NOTIFY.** Mirrors the review-scheduler
  precedent (invariant #7 — no second process, RAM-tight host). A `setInterval` tick fetches up to N
  rows where `status IN (pending,failed)` AND (`next_attempt_at` null or ≤ now), ordered by
  `created_at`, and processes them sequentially throttled to ~3 req/s. Per row: resolve target →
  map → create/update page → `done` + store `notion_page_id`. On error: `attempts++`,
  `last_error` = the error message (**never** raw body/progress values — invariant #9),
  `next_attempt_at` = now + min(base·2^attempts, cap) + jitter, `status=failed`; once
  `attempts ≥ MAX` → `dead`. Started in `src/index.ts` only when `NOTION_TOKEN` is set; its `stop()` is
  awaited in `registerShutdown` (stop polling, let the in-flight row finish).

- **`NotionCredentialResolver`.** `resolveNotionTarget(prisma, env, userId): Promise<{ client, dbIds } |
  null>` — reads `notion_config` for the user; `enabled=false`/absent → `null` (skip). `auth_type=env`
  → `new Client({ auth: env.NOTION_TOKEN })` + the four DB IDs (from the config row, seeded from env);
  `auth_type=oauth` → not implemented in v1 → `null` (skip). This is the single seam OAuth extends.

- **Row→page mappers (`src/notion/mapper.ts`).** One pure function per source table producing the
  Notion `properties` object for that table's DB. Property names follow the owner's ported Notion DBs;
  because they can't be validated against the live workspace in the sandbox, mappers are unit-tested
  for shape and the real round-trip is the deploy-time gate.

## Risks / Trade-offs

- **Crash between commit and enqueue → a row not mirrored.** Accepted (best-effort; data safe in PG).
  Mitigation seam noted: a periodic reconciliation sweep can be added later without schema change.
- **In-process worker shares the bot's event loop / memory.** Bounded by the ~3 req/s throttle and a
  small batch size; negligible vs the 512 MB cap. A separate worker process was rejected on invariant
  #7 (RAM) — matches the review-scheduler precedent.
- **Mapper property names may drift from the real Notion DB schema.** Surfaced only at deploy (no
  sandbox token); isolated to `mapper.ts` and adjustable without touching the outbox/worker.
- **New dependency `@notionhq/client`.** Small, official SDK; added to deps, image built off-box.

This worker + outbox is a significant, hard-to-reverse architectural addition with real trade-offs
(in-process vs separate service, post-write vs transactional outbox, poll vs LISTEN/NOTIFY) → a new
**ADR-0022** records it in the docs step.
