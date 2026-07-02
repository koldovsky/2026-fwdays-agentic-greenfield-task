# Proposal: hardening

## Why

Every feature slice (M0–M7) is code-complete, but the runtime is brittle in ways the PRD's
success metrics (§4) forbid: a throwing update handler or an unhandled rejection can kill the
long-poll process (M8 durability — lost replies), the Anthropic client runs on implicit SDK
defaults with no explicit retry/timeout posture (M5 cost, M7 latency, M8), outgoing Telegram
calls have no 429/network retry (M8), the review cron task is never stopped on shutdown and its
sweep's outer query is unguarded (M4 reliability), and there is zero observability for the two
metrics that must be verified on the box — prompt-cache hit-rate/cost (M5) and memory footprint
(M6): `cacheReadTokens` is computed and thrown away, and `/health` reports only `"ok"`. M8 is the
last backlog milestone; its exit bar is "all PRD §4 metrics verified", which needs both these code
hooks and a verification runbook.

This change serves no single user story — it hardens the substrate under all of them
(US-1…US-10), targeting PRD §4 M4, M5, M6, M7, M8.

## What Changes

- **Global error boundary (bot):** add `bot.catch` — log the error message-only (invariant #9),
  best-effort localized "something went wrong" reply to the affected chat, keep the long-poll
  alive. One bad update never kills the process.
- **Process-level last resort:** `unhandledRejection`/`uncaughtException` handlers — log
  message-only, exit non-zero; the container restarts and Telegram redelivers unacknowledged
  long-poll updates (no data loss, M8).
- **Telegram API resilience:** wire the `@grammyjs/auto-retry` transformer — outgoing API calls
  honor `retry_after` on 429 and retry transient network failures instead of throwing.
- **LLM client resilience:** instantiate the Anthropic SDK with explicit `maxRetries` and
  `timeout` (SDK-native backoff handles 429/5xx/network — a bounded transport retry of the SAME
  single call, not an agent loop; invariant #5 intact).
- **LLM usage observability (M5 + cache verification):** after each `parseStructured` call, log
  one structured line — capability tag, input/output tokens, `cache_read_input_tokens`,
  `cache_creation_input_tokens`, duration ms. Message-only, no prompt/user content (invariant #9).
  This is the evidence that the prompt cache actually hits (rule #5) and that spend tracks M5.
- **Review scheduler hardening (M4):** guard the sweep's outer user query so a transient DB error
  is logged, not an unhandled rejection; capture the `ScheduledTask` and stop it in
  `registerShutdown`.
- **Health/memory observability (M6):** `/health` returns JSON with process RSS + heap-used +
  uptime alongside liveness — the on-box probe for the 512 MB cap.
- **Verification runbook:** `docs/runbooks/hardening-verification.md` — the M1–M8 checklist
  mapping each PRD §4 metric to its verification procedure and evidence source. On-box items
  (memory caps, latency p90, live eval baselines, real spend) are deploy-time by design — the
  sandbox has no key/DB/box (logged skip per ADR-0013 / profile).

Explicitly out of scope: any LLM prompt/behavior change (no eval suite is touched), per-user
inbound throttling (single-digit users; YAGNI), a structured logging library (bare `console` +
`errorMessage` stays — RAM discipline), DB query-level retry (startup already fails fast;
Prisma pool handles reconnects).

## Capabilities

### New Capabilities

_None — hardening tightens existing capabilities' runtime requirements; no new user-facing
capability is introduced._

### Modified Capabilities

- `bot-runtime`: new requirements — update-handler error boundary (process survives a throwing
  handler, user gets an honest localized error reply), process-level fatal-error posture (log +
  exit non-zero, restart-safe), outgoing Telegram API retry on 429/transient failure, graceful
  shutdown covers the review cron task, `/health` reports RSS/heap/uptime JSON.
- `llm-client`: new requirements — explicit bounded transport retry/timeout on the single
  `messages.create` call (not an agent loop), and a per-call structured usage log line including
  cache-read/creation tokens and duration (prompt-cache + cost evidence; no content logged).
- `review-generation`: modified requirement — the hourly sweep SHALL never produce an unhandled
  rejection (outer query guarded), and the cron task SHALL stop on shutdown.

## Impact

- **Code:** `src/bot/bot.ts` (+`bot.catch`), `src/index.ts` (process handlers, scheduler stop,
  auto-retry wiring), `src/llm/client.ts` (SDK options), `src/llm/structured.ts` (usage return →
  callers or a logging seam), `src/bot/health.ts` (JSON body), `src/reviews/scheduler.ts` (outer
  guard, return task), `src/config/env.ts` (no new vars expected). Tests in mirrored `test/` for
  every new behavior.
- **Dependencies:** + `@grammyjs/auto-retry` (tiny transformer, no RAM impact).
- **Memory cap:** no new processes, no buffering — logging is one line per LLM call at
  ~10–20 msgs/day. Bot stays ≤512 MB (heap already capped 384 MB in Dockerfile).
- **LLM cost:** zero new LLM calls. SDK retries only re-send on 429/5xx failure — bounded
  (maxRetries ≤ 3) and rare; cost impact negligible vs. M5. Usage logging makes spend visible.
- **Docs:** new runbook; `docs/current-state.md`, AGENTS.md flips if any; likely ADR for the
  fatal-error posture (crash-and-restart vs. swallow) if the trigger test says so.
- **Deploy-time (out of sandbox):** on-box M6 memory verification, M7 latency sampling, M5 spend
  check, live eval baseline seeding — enumerated in the runbook, not executable here.
