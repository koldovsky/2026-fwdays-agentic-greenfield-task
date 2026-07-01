# ADR-0022 — Notion mirror via durable outbox + in-process poll worker

*Status: Accepted · Date: 2026-07-02 · Source: [requirements.md](../requirements.md) §9 (Notion
Mirror), [prd.md](../prd.md) US-10 + M7 (mirror never slows the bot; failures never lose data),
[openspec/backlog.md](../../openspec/backlog.md) `notion-mirror` (M7). Builds on
[ADR-0007](./0007-postgres-source-of-truth-notion-mirror.md) (Postgres is truth, Notion is an async
best-effort mirror). Precedent: [ADR-0020](./0020-per-user-local-midnight-review-cron.md) (a single
in-process background loop, not a second process).*

## Context

US-10 / §9: the owner's Postgres writes (`food_log` create + correction, `food_database`,
`body_metrics`, `reviews`) must also appear in **their own** Notion workspace — **async and
best-effort**. Two hard constraints from ADR-0007 and the invariants: Notion must **never block the
reply** (the user is confirmed the instant Postgres commits), and a Notion failure must **never lose
data** (Postgres is the source of truth, invariant #1). The host is RAM-tight (≤512 MB, invariant
#7); there is no second process budget. Only the owner exists today (single-user, `env`-token auth,
invariant #9 — the token lives in env, never in the DB), but the schema must be shaped so future
per-user OAuth slots in **without touching any write path**. Notion enforces ~3 req/s.

The question is the *mechanism*: how a mirrored write reliably becomes a durable, retryable Notion
job, who drains it, and how the credential/target is resolved per user.

## Decision

**A durable outbox table (`notion_sync`) fed by a best-effort post-write enqueue, drained by one
in-process poll worker, with per-user targets resolved from `notion_config` through a single
`NotionCredentialResolver` seam.**

- **Durable outbox `notion_sync`.** One row per mirrored write: `source_table`
  (`food_log|food_database|body_metrics|review`), `source_id`, `user_id`, `notion_page_id?`,
  `status` (`pending|done|failed|dead`), `attempts`, `last_error?`, `next_attempt_at?`, timestamps;
  index `(status, next_attempt_at)` for the poll query. Idempotency key `(source_table, source_id)`:
  the worker reuses a prior `done` row's `notion_page_id` to decide create-vs-update, so a `food_log`
  correction **patches** the existing page instead of duplicating it.
- **Enqueue is post-write, best-effort, NOT transactional.** Each writing service calls a shared
  injected `outbox.enqueue({ sourceTable, sourceId, userId })` right after its successful Postgres
  write; the whole enqueue is wrapped so its own failure is warn-logged (message only, invariant #9)
  and **never propagates to the reply**. The outbox is a constructor dependency, defaulting to a
  `noopOutbox` (mirror off ⇒ a true no-op, services stay decoupled from the Notion tables).
- **Per-user `notion_config` + `NotionCredentialResolver`.** `user_id @unique`, `auth_type`
  (`env|oauth`), `credential_ref` (the env var **name** e.g. `"NOTION_TOKEN"`, never the secret),
  the four Notion DB IDs, `enabled`. `resolveNotionTarget` returns `{ notion, dbIds } | null`;
  `env` → `new Client({ auth: env.NOTION_TOKEN })`; absent / `enabled=false` / `oauth` → `null`
  (skip). v1 seeds one `env` row for the owner lazily on first enqueue. This is the single seam
  OAuth extends — a new `auth_type` branch, not a write-path change.
- **One in-process poll worker.** A `setInterval` tick (default 5 s) fetches a bounded batch
  (default 20) of `status IN (pending, failed)` AND (`next_attempt_at` null or ≤ now) ordered by
  `created_at` in ONE query, processes them sequentially throttled to ~3 req/s (334 ms), and per row
  resolves target → maps the source row → creates/updates the page → `done` + stores
  `notion_page_id`. Per-row try/catch: `attempts++`, `last_error` = the error **message only**,
  `next_attempt_at = now + min(base·2^attempts, cap) + jitter` (base 1 s, cap 1 h), `status=failed`;
  at `attempts ≥ 5` → `dead` (dead-letter, never re-picked). One row's failure never aborts the
  batch. Started in `src/index.ts` **only when `NOTION_TOKEN` is set**; `stop()` is awaited in
  `registerShutdown` — polling halts and the in-flight row is allowed to finish.

## Consequences

- **+** Notion I/O is fully off the reply path (US-10): the user is confirmed the instant Postgres
  succeeds; all Notion latency, throttling, and retries happen behind the outbox.
- **+** No data loss on Notion failure (invariant #1 / ADR-0007): the row is safe in Postgres; the
  job retries with backoff and, worst case, parks in `dead` for inspection — it is never silently
  dropped.
- **+** One lightweight in-process loop, no second process (invariant #7): bounded batch + ~3 req/s
  throttle + no standing state keeps it well under the 512 MB cap. Restart-safe — all state is in
  `notion_sync`.
- **+** Idempotent: `(source_table, source_id)` + stored `notion_page_id` means a retry or a
  correction never duplicates a page.
- **+** OAuth-ready without a write-path change: the `NotionCredentialResolver` + `notion_config`
  are the only seam a future OAuth flow touches; the outbox, worker, and every service stay as-is.
- **+** Privacy held (invariant #9): the token stays in env / referenced by name only; `last_error`
  is a bounded message string — raw body/progress values are never logged or stored.
- **−** A crash in the window between the Postgres commit and the enqueue leaves a row unmirrored.
  Accepted (best-effort; the data is safe in PG). Mitigation seam noted: a periodic reconciliation
  sweep can be added later with **no schema change**.
- **−** The worker shares the bot's event loop and memory. Bounded by the throttle + small batch;
  negligible vs the cap — the same trade-off ADR-0020 accepted for the review scheduler.
- **−** Mapper property names can't be validated against the live Notion workspace in the sandbox
  (no token), so a schema drift only surfaces at deploy. Isolated to `mapper.ts`, adjustable without
  touching the outbox/worker. The **real Notion round-trip is a deploy-time gate**.

## Alternatives considered

- **Transactional outbox (enqueue inside the write's `$transaction`).** Zero crash-window, but the
  four writing services take narrow `Pick` Prisma clients that don't expose `$transaction`; forcing
  it in would widen types across the whole write layer for **no data-safety gain** (Postgres is the
  truth and the mirror is explicitly best-effort). Rejected — the crash-window loses only a *mirror
  job*, never *data*, recoverable by a later reconciliation sweep.
- **LISTEN/NOTIFY (push) instead of polling.** Lower latency, but adds a dedicated listener
  connection and reconnection/missed-notification handling for a best-effort mirror with no sub-minute
  SLA. Rejected: the poll query is a single indexed scan on a cheap cadence — simpler and restart-safe
  (a missed tick self-heals; nothing to replay).
- **A separate worker process / queue service (BullMQ, a second container).** The textbook outbox
  drainer, but a second process/Redis blows the RAM cap (invariant #7). Rejected on the same grounds
  as ADR-0020 — the in-process loop matches the established precedent.
- **Shared single Notion workspace for all users.** Simpler config, but violates the privacy-first
  ownership model (§9) and doesn't shape for per-user OAuth. Rejected — `notion_config` is per-user
  from day one even though only the owner exists.
