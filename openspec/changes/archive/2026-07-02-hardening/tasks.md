# Tasks: hardening

## 1. LLM client resilience + usage observability (D3, D4)

- [x] 1.1 Instantiate the Anthropic SDK with explicit `maxRetries: 3` and `timeout: 60_000` in
  `src/llm/client.ts`; test asserts the options are passed (no live call).
- [x] 1.2 Extend `parseStructured` (`src/llm/structured.ts`) to read `input_tokens`,
  `output_tokens`, `cache_creation_input_tokens` (alongside the existing
  `cache_read_input_tokens`) and measure wall-clock duration; accept an optional `label` param.
- [x] 1.3 Emit exactly one `[llm]` usage log line per call from inside `parseStructured` —
  label + numbers only, never prompt/output/user content (invariant #9). Tests: line emitted with
  cache-read count; a call carrying personal data logs no content (spy on console).
- [x] 1.4 Pass capability labels at all 7 call sites: `router-intent`, `food-estimate`,
  `plate-vision`, `plate-refine`, `progress-analyze`, `review-daily`, `review-rollup`.

## 2. Bot error boundary + Telegram retry (D1, D5)

- [x] 2.1 Add `@grammyjs/auto-retry` dep; wire `bot.api.config.use(autoRetry({ maxRetryAttempts: 3,
  maxDelaySeconds: 10 }))` in `createBot`.
- [x] 2.2 Register `bot.catch` in `createBot`: log message-only via `errorMessage`, best-effort
  localized "something went wrong" reply (detectLang on inbound text; no text → Russian default),
  reply failure swallowed. Tests: throwing handler doesn't propagate; error reply attempted in the
  inbound language; failing reply swallowed; log carries no user values (invariant #9).

## 3. Process posture + shutdown + scheduler guard (D2, D6)

- [x] 3.1 Install `unhandledRejection`/`uncaughtException` handlers in `src/index.ts`: log
  message-only, exit non-zero (crash-and-restart posture, restart-safe per long-poll redelivery).
- [x] 3.2 Guard the review sweep's outer path so a tick never yields an unhandled rejection
  (catch + message-only log around/inside `sweepReviews`); test: user-listing query throws →
  logged, no rejection escapes, next tick unaffected.
- [x] 3.3 Capture the `ScheduledTask` from `startReviewScheduler` in `src/index.ts` and stop it in
  `registerShutdown` (before bot/worker teardown); test scheduler stop is invoked on shutdown.

## 4. Health memory probe (D7)

- [x] 4.1 `/health` returns `200` + `application/json` body `{ status, rssMb, heapUsedMb,
  uptimeSec }` from `process.memoryUsage()`/`process.uptime()` (rounded). Tests: 200 preserved,
  JSON fields present and numeric.

## 5. Verification runbook + docs (D8)

- [x] 5.1 Write `docs/runbooks/hardening-verification.md`: per PRD §4 metric (M1–M8) — procedure,
  where it runs (sandbox test vs. on-box deploy-time), evidence source. Mark the deploy-time
  remainder explicitly (no key/DB/box in sandbox — skip-with-note pattern).
- [x] 5.2 Invariant regression sweep: confirm the touched paths keep the standing CRITICAL tests
  green — full `npm test` (incl. images-never-persisted fs-spy suites, totals==SUM, tenancy) —
  and add nothing that logs raw body/progress values (invariant #9 grep of new log sites).
- [x] 5.3 ADR trigger test for the runtime-resilience posture (D2 crash-and-restart + D3/D5
  explicit bounded retries); if it passes and no existing ADR covers it, write the ADR + update
  `docs/adr/README.md` index.

## 6. Review gate (maker ≠ checker)

- [x] 6.1 Hand the diff since the start SHA to a SEPARATE reviewer subagent (the `review` skill:
  Standards + Spec axes) and resolve every finding before commit. No self-approval.
  <!-- 2026-07-02: Opus checker → APPROVE, both axes PASS; 1 SUGGESTION (no unit test that the
  auto-retry transformer is wired — accepted, needs a live 429; covered by runbook deploy step). -->

