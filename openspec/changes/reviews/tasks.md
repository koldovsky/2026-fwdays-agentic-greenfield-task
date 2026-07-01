## 1. Dependency & shared seams

- [x] 1.1 Add `node-cron` + `@types/node-cron` to `package.json` (deps / devDeps); regenerate lockfile off-box aware (no install on host, invariant #7).
- [x] 1.2 Extract canonical `resolveUserId(client, chatId): Promise<number | null>` to `src/db/resolveUser.ts` (structural narrow client type) — the single shared home reviews will import (D4). Do NOT repoint the existing four copies (that's `shared-tenant-resolve`).
- [x] 1.3 Add `dailyTotalsForRange(client, userId, start, end)` to `src/query/aggregate.ts` — ONE `foodLog.groupBy({ by:['date'], _sum })`, tenant-scoped, no N+1 (D3). Return per-day totals array (Decimal→number at the boundary, like `sumForDate`).

## 2. reviews module — types & pure compute

- [x] 2.1 `src/reviews/types.ts`: `ReviewPeriod`, `ReviewClient` (narrow Pick over PrismaClient: user, foodLog, bodyMetric, review), `ReviewStats` (all numeric fields), `ReviewProse`, `ReviewService` interface.
- [x] 2.2 `src/reviews/compute.ts`: boundary helpers in user TZ — `isSunday(date, tz)`, `isLastDayOfMonth(date, tz)`, `weekRange(date, tz)` (Mon–Sun), `monthRange(date, tz)`; period-number math — averages over LOGGED days only, `daysHitProtein`/`daysHitFat`, coverage `loggedDays/periodDays`, weight/waist delta vs prior period (like-with-like). Pure, explicit return types, no I/O.
- [x] 2.3 `src/reviews/aggregate.ts`: tenant-scoped body_metrics range read for the period + reuse `src/metrics/trend.ts` `metricStaleness`/history for staleness reminders and prior-period baselines.

## 3. LLM prose (one call) & rendering

- [x] 3.1 `src/reviews/schema.ts`: zod schema of PROSE-ONLY slots (daily: `drivers`, `verdict`; weekly/monthly: `whatWorked`, `draggedBack`, `focus`). No numeric fields.
- [x] 3.2 `src/reviews/prompt.ts`: serialize the computed `ReviewStats` + light driver hints into the user message; the coach voice comes from the cached `systemPrefix` (no per-call persona text).
- [x] 3.3 `src/reviews/generate.ts` (or in service): exactly ONE `parseStructured` call (no agent loop, invariant #5) → `ReviewProse`.
- [x] 3.4 `src/reviews/render.ts`: per-period deterministic template fill matching `docs/review-templates.md` (daily/weekly/monthly), splice prose slots, language-mirrored via `detectLang` (manual) / Russian default (cron), numbers via `fmt`. Edge cases: empty period → nudge not zeros; partial → coverage line; missing delta → "—"; missing metric → omit / "нет данных".

## 4. Persistence & service orchestration

- [x] 4.1 `src/reviews/write.ts`: tenant-scoped upsert on unique `(user_id, period, period_start)` (idempotent, no doubles); `reviewed_flag` param (manual=true, cron=false).
- [x] 4.2 `src/reviews/service.ts`: `createReviewsService(client, deps)` → `generateDaily(chatId, opts)` (resolve user via `src/db/resolveUser.ts`, compute daily stats from `sumForDate`, one prose call, render, upsert, return text) + rollup: after a daily, if Sunday → `generateWeekly`, if month-end → `generateMonthly` (numbers from `dailyTotalsForRange`/body range, invariant #2). Tenant-scoped throughout (#8).

## 5. Scheduler (cron fallback)

- [x] 5.1 `src/reviews/scheduler.ts`: `startReviewScheduler(service, client, send)` — one `node-cron` job `0 * * * *`; per tick sweep users, for each whose LOCAL hour is `00` and finished day has no daily `reviews` row → generate + proactively `send`, `reviewed_flag=false` (D1/ADR-0020). Wrap each user in try/catch so one failure never aborts the sweep; warn-log without raw body values (invariant #9).

## 6. Bot & entrypoint wiring

- [x] 6.1 `src/bot/bot.ts`: register `/done` command (alongside `/start`, `/progress`) → `deps.reviews.generateDaily(chatId, { triggerText })`; add a `review_trigger` case to `dispatch()` (currently falls through) → same. Add `ReviewService` to `BotDeps` (`src/bot/types.ts`).
- [x] 6.2 `src/index.ts main()`: construct the reviews service; start the scheduler with a `send(chatId, text)` callback backed by `bot.api.sendMessage`. Order after `bot.start()` wiring; memory-cap aware (one job, invariant #7).

## 7. Tests (test/ mirrors src/, vitest, mock Prisma via makeFake)

- [x] 7.1 `test/reviews/compute.test.ts`: boundary math — Sunday detection & last-day-of-month across TZs; week/month range; averages over logged days only; days-hit-target; coverage.
- [x] 7.2 `test/reviews/service.test.ts` (invariant #2): every rendered total == the SUM/average of the mocked `food_log` rows, independent of the mocked prose; exactly ONE LLM call (invariant #5, spy).
- [x] 7.3 `test/reviews/service.test.ts` (idempotency / M4): re-triggering the same day upserts one row; cron does not double a manually-reviewed day (`reviewed_flag` guard).
- [x] 7.4 `test/reviews/service.test.ts` (invariant #8): tenant scoping — user A's review excludes user B's rows; review row written under A's `user_id`.
- [x] 7.5 `test/reviews/render.test.ts` (edge cases): empty period nudge; partial-period coverage line; missing delta "—"; missing body metric omitted; language mirrored (manual UK) vs Russian default (cron).
- [x] 7.6 `test/reviews/scheduler.test.ts`: per-user local-midnight selection (injected clock) fires only due users; already-reviewed day skipped; a throwing user doesn't abort the sweep.
- [x] 7.7 `test/query/aggregate.test.ts`: `dailyTotalsForRange` groups by date, tenant-scoped, single query (no N+1). `test/db/resolveUser.test.ts`: resolves id, null on unknown chat_id.

## 8. Evals & docs

- [x] 8.1 Reviews prose has no deterministic-gradeable output beyond structure; a live judge/output eval is deploy-time (no key in sandbox) — log the skip per ADR-0013. Assert the render structure in unit tests instead.
- [x] 8.2 Update `docs/current-state.md` (M6 flip, reviews line + date), flip any AGENTS.md planned→live if applicable; ADR-0020 already added + indexed. Run `npm run docs:check`.

## 9. Gates & review

- [x] 9.1 Run `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` — all green.
- [x] 9.2 Step-7 duplication gate: cross-reference the diff's new symbols against all of `src/` — zero new copies (esp. resolveUserId, food SUM, date/lang/fmt); confirm reuse.
- [x] 9.3 **Maker ≠ checker**: hand the full diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes). Resolve every finding before commit; do not self-approve. — Opus reviewer: 0 CRITICAL, 1 MAJOR (M1 rollups undelivered) resolved → re-review CONFIRMED.
