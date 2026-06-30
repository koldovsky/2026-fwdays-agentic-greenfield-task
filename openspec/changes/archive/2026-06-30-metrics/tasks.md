## 1. Types + parser (pure, no I/O)

- [x] 1.1 Add `src/metrics/types.ts`: `MetricColumn` (union of the six `body_metrics` numeric columns), `ParsedMetrics` (partial `Record<MetricColumn, number>`), a `MetricDelta` ({ column, value, prior, delta } with `prior`/`delta` nullable for a first-ever metric), and a `MetricConfirmation` shape. `MetricsService` + `RoutedMetric` (the router fields metrics consumes: resolved `date`). `MetricsClient = Pick<PrismaClient, 'user' | 'bodyMetric'>`.
- [x] 1.2 Add `src/metrics/parse.ts`: `parseMetrics(text)` — a synonym→column map (RU/UA/EN per design §1) + a `<keyword> <number>` scan (accept `.`/`,` decimals); return only the present fields. Drop out-of-range values (reuse onboarding's ranges where sensible). Explicit return type; no LLM.

## 2. Write + trend (DB, tenant-scoped)

- [x] 2.1 Add `src/metrics/write.ts`: `upsertMetrics(client, userId, date, parsed)` — tenant-scoped `findFirst(userId, date)` → `update` (merge fields, never null an unmentioned one) else `create`; `user_id` via `tenantWhere`. Explicit return of the row. No N+1.
- [x] 2.2 Add `src/metrics/trend.ts`: `priorHistory(client, userId, beforeDate)` — one bounded `findMany(userId, date < beforeDate, orderBy date desc)`; `computeDeltas(parsed, history)` scans in code for the most-recent prior non-null value PER field → `MetricDelta[]` (like-with-like, per design §3); `metricStaleness(history, asOf)` → per-column days-since-last (or never). Pure functions over the fetched history (no per-field query).

## 3. Service + confirm

- [x] 3.1 Add `src/metrics/confirm.ts`: build the confirmation prose (code-built values + signed deltas + localized labels; columns stay English) mirroring the user's language; a first-ever metric shows no delta. Reuse the `detectLang` shape from food-text's confirm. A no-metrics-parsed message returns a nudge reply.
- [x] 3.2 Add `src/metrics/service.ts`: `createMetricsService` → `logMetric(chatId, text, routed)` — resolve user id from chat_id (tenancy) → parse → (nudge if empty) → fetch prior history once → upsert → compute deltas off the SAME history → build confirmation. Orchestration only; no inline SQL; never logs raw values (invariant #9). Inject `userTz`/`now` for determinism if needed.

## 4. Bot wiring

- [x] 4.1 In `src/bot/bot.ts`: route the post-onboarding `metric` intent to `logMetric`, reply with the confirmation. Keep the existing echo for the other not-yet-built intents. Wire `MetricsService` through `BotDeps`; construct it in `index.ts`.

## 5. Tests (verify the invariants)

- [x] 5.1 `test/metrics/parse.test.ts`: RU/UA/EN synonyms → columns; `.`/`,` decimals; partial messages (only present fields); unrecognized tokens skipped; out-of-range dropped; no value emitted by a model (pure). (invariants #2/#5).
- [x] 5.2 `test/metrics/trend.test.ts`: per-field most-recent-prior delta (NOT vs start), each metric like-with-like against its own prior, first-ever metric → null delta; `metricStaleness` days-since / never. (invariant #2).
- [x] 5.3 `test/metrics/service.test.ts`: tenancy (row carries user_id; prior lookup scoped to the user), upsert merges same-date fields (no duplicate, no null-out), "вчера" back-dates to the router-resolved date, confirmation shows code-built values + deltas and prose mirrors language, empty parse → nudge (no write). Fake Prisma. Plus `test/bot/bot.test.ts` metric-routing.

## 6. Review (maker ≠ checker)

- [x] 6.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes). Resolve every finding before commit. No self-approval. (Opus reviewer returned CLEAN; resolved 3 MINOR parser false-positives via a word-boundary lookbehind + added the `талию` recall; +3 regression tests.)
