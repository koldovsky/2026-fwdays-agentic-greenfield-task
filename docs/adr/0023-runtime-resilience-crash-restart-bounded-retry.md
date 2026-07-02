# ADR-0023 — Runtime resilience: crash-and-restart fatal posture + explicit bounded external-API retry

*Status: Accepted · Date: 2026-07-02 · Source: [prd.md](../prd.md) §4 M5/M6/M7/M8 (cost,
footprint, latency, durability), [openspec/backlog.md](../../openspec/backlog.md) `hardening` (M8),
[openspec/changes/hardening/design.md](../../openspec/changes/hardening/design.md) D2/D3/D5.
Complements [ADR-0003](./0003-raw-anthropic-api-no-agent-framework.md) (raw Anthropic API, no agent
loop — invariant #5), [ADR-0014](./0014-long-polling-over-webhook.md) (long-poll delivery), and
[ADR-0004](./0004-self-hosted-postgres-coolify.md) (Coolify supervises the container).*

## Context

M0–M7 are code-complete; M8's exit bar is "all PRD §4 metrics verified". The long-poll process had
no failure posture: any throwing update handler or escaped promise rejection could kill the poller
(M8 — lost replies), and both external APIs ran on **implicit** transport defaults — the Anthropic
SDK's silent 2-retry / 10-minute timeout, and no 429/network retry at all on outgoing Telegram
calls. Two questions needed a recorded, hard-to-reverse decision:

1. **What does the process do when an error escapes every boundary?** Continue, or crash and let the
   supervisor restart it? This is a genuine availability-vs-state-integrity trade-off on a bot whose
   **DB is the user's source of truth** (invariant #1).
2. **What is the retry/timeout posture for the two external APIs?** This bounds cost (M5), latency
   (M7), and durability (M8), and must not become an agent loop (invariant #5).

No existing ADR covers either; ADR-0003 governs the *shape* of an LLM call (single deterministic
call, no agent framework), not what happens on transport failure or process fault.

## Decision

**Crash-and-restart on unrecoverable faults, and an explicit, bounded transport-retry posture for
both external APIs — transport resilience only, never an agent loop.**

- **Update-handler error boundary (`bot.catch`, D1).** A thrown handler error is caught, logged
  **message-only** (invariant #9), and answered with a best-effort language-mirrored "something went
  wrong" reply (prose mirrors the inbound text; no text → Russian default, same rule as the
  caption-less progress photo). The apology itself is wrapped — a failed apology is logged and never
  rethrown. The poller keeps running: one bad update never kills the process, and a failed update is
  never silently swallowed (the coach contract).
- **Process-level fatal posture: crash-and-restart (D2).** `unhandledRejection` and
  `uncaughtException` log the reason message-only and `process.exit(1)`. Continuing past an uncaught
  fault risks running with corrupted state (half-open clients, broken invariants) on a
  data-authoritative service. Coolify restarts the container; grammY long-poll only acknowledges
  updates it has already fetched, so unfetched updates are **redelivered** by Telegram — no logged
  entry is lost (Postgres writes are already committed or absent). The review sweep's fire-and-forget
  tick is guarded so a transient DB error can never turn an hourly cron into an hourly crash.
- **Anthropic client: explicit SDK options, no custom loop (D3).**
  `new Anthropic({ apiKey, maxRetries: 3, timeout: 60_000 })`. The SDK's native exponential backoff
  honors `retry-after` on 429/5xx/connection errors; `maxRetries` re-sends the **same single
  deterministic call** (invariant #5 intact — no branch on model output, no new call class), and the
  60s ceiling replaces the absurd 10-minute default (M7's p90 targets are 3s/8s; 60s only bounds a
  pathological hang, generous over the vision tail).
- **Telegram outgoing resilience: `@grammyjs/auto-retry` (D5).**
  `bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 10 }))` honors `retry_after`
  on 429 and retries transient network errors; a still-failing call surfaces to the D1 boundary. A
  long flood (`retry_after` > 10s) fails fast rather than blocking the single long-poll worker.

## Consequences

- **+** M8 durability: one bad update, one LLM failure, or one transient DB blip no longer kills the
  poller; on a genuine fatal fault the process restarts clean and Telegram redelivers unacked updates
  — zero logged-entry loss.
- **+** M5/M7: the retry budgets are bounded (≤3 attempts each) and rare, so cost impact is
  negligible; the explicit 60s timeout caps pathological latency instead of hanging for 10 minutes.
- **+** Invariant #5 held: every retry re-sends the identical single structured call — transport
  resilience, not an autonomous loop; no new LLM call class is introduced.
- **+** Invariant #9 held: every new log site (boundary, fatal handlers, sweep guard) logs the error
  **message only** via the shared `errorMessage` helper — never raw body/progress values or payloads.
- **−** Crash-and-restart drops in-flight work in the crash window. Bounded: long-poll redelivers
  unacked updates, Postgres writes are atomic per handler, and the Notion outbox already tolerates a
  crash window (ADR-0022). Worst case: one duplicate confirmation after restart.
- **−** `auto-retry` can delay a reply up to ~30s under a sustained flood before failing into the
  boundary. Preferable to a silent drop; capped by `maxDelaySeconds` × attempts.
- **−** Live verification (real 429 handling, real timeout, real restart/redelivery) needs the box +
  key and is a **deploy-time gate** — enumerated in `docs/runbooks/hardening-verification.md`, not
  runnable in the sandbox.

## Alternatives considered

- **Swallow-and-continue on `uncaughtException`.** Maximizes availability, but a data-authoritative
  bot running on undefined state can corrupt the user's source of truth. Rejected — restart-safety
  (redelivery + atomic PG writes) makes crashing the safer posture.
- **Hand-rolled retry wrapper around `messages.create`.** Duplicates SDK-native backoff (rule #12 in
  spirit) and adds surface for bugs and for accidentally becoming a loop. Rejected — make the SDK's
  posture explicit instead.
- **grammY throttler plugin (proactive rate-shaping) for Telegram.** At single-digit users the
  proactive limits are never hit; reactive `auto-retry` is enough (YAGNI). Rejected.
- **Silent boundary (log, no user reply).** An unacknowledged message breaks the coach contract;
  honest localized failure is a persona requirement. Rejected.
