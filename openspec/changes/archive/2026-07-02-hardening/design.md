# Design: hardening

## Context

All feature milestones (M0–M7) are code-complete. The runtime, however, has no error boundary:
`createBot` registers handlers with no `bot.catch` (`src/bot/bot.ts:451-460`), the process has no
`unhandledRejection`/`uncaughtException` handlers, the review cron's `ScheduledTask` is discarded
at `src/index.ts:98` (never stopped on shutdown) and its sweep's outer `user.findMany`
(`src/reviews/scheduler.ts:34`) sits outside the per-user try/catch — a transient DB error there
becomes an unhandled rejection from a fire-and-forget `void sweepReviews(...)`. The Anthropic
client is `new Anthropic({ apiKey })` with implicit SDK defaults (`src/llm/client.ts:10`);
outgoing Telegram API calls have no 429/network retry. `parseStructured` already computes
`cacheReadTokens` (`src/llm/structured.ts:82`) but every caller destructures `{ data }` only —
the prompt-cache hit evidence is thrown away. `/health` returns the string `ok` and nothing else.

The M8 exit bar is "all PRD §4 metrics verified" (M1–M8). The sandbox has no `ANTHROPIC_API_KEY`,
no `DATABASE_URL`, no production box — so verification splits into **code hooks + tests**
(shippable here) and **on-box procedures** (deploy-time, enumerated in a runbook).

## Goals / Non-Goals

**Goals:**

- One bad update, one LLM failure, or one transient DB error never kills the long-poll process
  (M8) and never silently swallows the user's message — the user gets an honest localized error.
- Bounded, explicit transport-retry posture for both external APIs (Anthropic, Telegram).
- Observability hooks for the two on-box metrics: per-LLM-call usage/cache/duration log line (M5,
  rule #5 cache verification, M7 latency evidence) and RSS/heap in `/health` (M6).
- A deploy-time verification runbook mapping every PRD §4 metric to procedure + evidence.

**Non-Goals:**

- No LLM prompt/behavior change (no eval suite touched — ADR-0013 gate skips with note).
- No inbound per-user throttling, no structured-logging library, no DB query-level retry, no
  webhook migration, no metrics/telemetry service (RAM + YAGNI at single-digit users).
- No change to the photo-download `fetch` (`bot.ts:287-290`) — it already degrades gracefully
  (null → handler replies); considered and deferred.

## Decisions

### D1 — Update-handler error boundary: `bot.catch` inside `createBot`

`bot.catch` is registered in `createBot` (testable without network): log the error **message
only** via the existing `errorMessage` helper (invariant #9 — no stack-with-values, no user
content), then best-effort reply to the affected chat with a short localized "something went
wrong, try again" line (language via `detectLang` on the inbound text; no text → Russian default —
same rule as progress-photo D6). The reply itself is wrapped in try/catch (Telegram may be the
thing that's down); a failed apology never rethrows. The long-poll loop keeps running.

*Alternative — leave grammY default (rethrow → poller dies):* rejected, violates M8.
*Alternative — silent swallow (log only, no reply):* rejected — an unacknowledged message breaks
the coach contract; honest failure is a persona requirement.

### D2 — Process-level fatal posture: log + exit non-zero (crash-and-restart)

`process.on('unhandledRejection')` and `process.on('uncaughtException')`: log message-only, `process.exit(1)`.
Coolify restarts the container; grammY long-polling only acknowledges updates it has fetched, so
unfetched updates are redelivered by Telegram — no logged-entry loss (M8; Postgres writes are
already committed or not). Continuing after an uncaught exception risks running with corrupted
state (half-open clients, broken invariants) on a bot whose DB is the user's source of truth.

*Alternative — swallow and continue:* rejected; undefined state on a data-authoritative service.
*ADR candidate:* yes — run the docs-step trigger test; posture is a real trade-off (availability
vs. state integrity).

### D3 — Anthropic client: explicit SDK options, no custom retry loop

`new Anthropic({ apiKey, maxRetries: 3, timeout: 60_000 })`. The official SDK already implements
exponential backoff honoring `retry-after` on 429/5xx/connection errors — we make the posture
explicit instead of inheriting silent defaults (2 retries, 10-minute timeout — the latter is
absurd against M7's 3 s/8 s p90 targets; 60 s is a hard ceiling, generous over the vision call).
This is a **transport retry of the same single deterministic call** — invariant #5 (no agent
loop) is untouched; no new call class, no loop over model output.

*Alternative — hand-rolled retry wrapper around `messages.create`:* rejected — duplicates
SDK-native behavior (rule #12 in spirit) and adds surface for bugs.

### D4 — LLM usage log: one line per call, inside `parseStructured`

The single seam every LLM call already funnels through (`structured.ts`) logs after each call:
`[llm] label=<label> in=<n> out=<n> cacheRead=<n> cacheWrite=<n> ms=<n>`. `parseStructured` gains
an optional `label` (each of the 7 call sites passes its capability name: `router-intent`,
`food-estimate`, `plate-vision`, `plate-refine`, `progress-analyze`, `review-daily`,
`review-rollup`). Log is numbers + enum label only — never prompt, content, or user values
(invariant #9). `cache_creation_input_tokens`, `input_tokens`, `output_tokens` and wall-clock
duration join the already-read `cache_read_input_tokens`. This single line is simultaneously the
M5 cost evidence, the rule-#5 cache-hit verification (cacheRead > 0 on the second call), and the
M7 LLM-leg latency sample.

*Alternative — log at each caller:* 7 copies of one fact (rule #12 violation). Rejected.
*Alternative — persist usage to a DB table:* rejected — YAGNI, logs suffice for single-digit
users; no new table for M8.

### D5 — Telegram outgoing resilience: `@grammyjs/auto-retry` transformer

`bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 10 }))` wired in
`createBot`. Honors `retry_after` on 429 and retries transient network errors; a still-failing
call then surfaces to D1's boundary. Official grammY plugin, transformer-only (no runtime
footprint). Long floods (retry_after > maxDelaySeconds) fail fast rather than blocking the
long-poll worker for minutes.

*Alternative — throttler plugin (proactive rate-shaping):* rejected — single-digit users can't
hit proactive limits; reactive retry is enough (YAGNI).

### D6 — Scheduler hardening: guard the tick, own the task

`startReviewScheduler` keeps returning the `ScheduledTask`; `src/index.ts` captures it and
`registerShutdown` stops it (before `bot.stop()`/worker stop — no new sweeps mid-shutdown). The
fire-and-forget tick becomes `void sweepReviews(...).catch(log message-only)` (or an outer
try/catch inside `sweepReviews`) so the outer `findMany` can no longer produce an unhandled
rejection — which, after D2, would otherwise *crash the process hourly* on a transient DB blip.
Per-user isolation inside the sweep is already correct and stays.

### D7 — `/health` reports memory as JSON

`GET /health` → `200` with `{ "status": "ok", "rssMb": <n>, "heapUsedMb": <n>, "uptimeSec": <n> }`
from `process.memoryUsage()`/`process.uptime()`, rounded. Any 200 keeps existing probes green
(Coolify checks status code). This is the M6 on-box probe: `curl /health` inside the network
shows live RSS against the 512 MB cap without shelling into the container.

*Alternative — separate `/metrics` endpoint:* rejected — second surface for one consumer; the
probe port is internal-only (no public ingress, ADR-0014).

### D8 — Verification runbook, not verification theater

`docs/runbooks/hardening-verification.md`: a table per PRD §4 metric (M1–M8) — what to run,
where (sandbox test vs. on-box), what evidence closes it. Sandbox-verifiable now: M3 (SUM tests),
M4 (idempotency tests), M8 (crash/redelivery posture + outbox tests). Deploy-time: M1/M2 (live
eval baselines — need key), M5 (usage log + console spend), M6 (health RSS + `docker stats` +
PG cap + mysqld alive), M7 (timestamps in usage line + reply p90). The backlog's "Done when all
§4 metrics verified" is satisfied in-sandbox by: hooks + tests shipped, runbook enumerating the
on-box remainder — same skip-with-note pattern every prior change used for deploy-time gates.

## Risks / Trade-offs

- **[Crash-and-restart drops in-flight work]** → Long-poll redelivers unacked updates; Postgres
  writes are atomic per handler; the Notion outbox already tolerates a crash window (ADR-0022).
  Worst case: one duplicate confirmation message after restart.
- **[auto-retry delays a reply up to ~30 s under a flood]** → capped `maxDelaySeconds: 10` ×3;
  beyond that the call fails into D1's honest error. Preferable to silent drop.
- **[60 s Anthropic timeout still ≫ M7 targets]** → M7 is a p90 product metric, not a timeout;
  the ceiling only bounds pathological hangs. Tightening below the vision-call tail would create
  false failures.
- **[`/health` JSON could break a strict probe]** → Coolify probes status code, not body;
  verified in runbook step. Content-type set to `application/json`.
- **[New dep `@grammyjs/auto-retry`]** → official grammY plugin, zero transitive deps,
  transformer pattern; pinned like every other dep.
- **Memory footprint:** no new processes/buffers; one console line per LLM call (~10–20/day).
  Bot stays under the 512 MB cap (heap cap 384 MB unchanged). **Build stays off-box** — CI →
  GHCR; nothing added to the production host (rule #7).

## Migration Plan

Pure code + docs change; no schema migration, no env-var change (`config/env.ts` untouched).
Deploy = normal image pull. Rollback = previous image. On-box verification steps land in the
runbook and run at the next deploy.

## Open Questions

None blocking. ADR for the D2 fatal posture (and D3/D5 explicit-retry posture as one "runtime
resilience" record) is decided by the docs-step trigger test.
