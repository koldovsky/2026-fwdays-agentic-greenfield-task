# Tasks — add-daily-insight

Build shared-first and test-first on the pure logic (AGENTS.md). The whole stack must be green
through `gate` with **no** Anthropic key (fallback mode); wiring a key later flips on live output.

## 1. Shared — contracts + TZ-aware dates

- [x] 1.1 Add `localDateKeyInTz(value: string | Date, timeZone?: string): string` to
  `packages/shared/src/dates.ts` (uses `Intl.DateTimeFormat('en-CA', { timeZone, year, month, day })`;
  falls back to runtime zone when `timeZone` omitted). Keep existing `localDateKey` behavior.
- [x] 1.2 Add `InsightSummary` and `DailyInsight` (response) contracts to
  `packages/shared/src/contracts.ts` per design §2 and §6.
- [x] 1.3 Export new symbols from `packages/shared/src/index.ts`.

## 2. Shared — insight shaping + fallback + guardrails (test-first)

- [x] 2.1 Write `packages/shared/src/insight.test.ts` fixtures + assertions first: `buildInsightInput`
  (14-day window in a given tz, start-day attribution, running entries = 0, top-3 tags, avg of prior
  13 days), `fallbackInsight` (deterministic sentence; ≤ 200 chars, English, no emoji, only summary
  figures), `sanitizeInsight` (trim, strip emoji, reject > 200 chars, reject fabricated numbers → null).
- [x] 2.2 Implement `packages/shared/src/insight.ts`: `buildInsightInput(entries, now, timeZone)`
  reusing the windowing approach from `stats.ts` but keyed via `localDateKeyInTz`.
- [x] 2.3 Implement `fallbackInsight(summary): string` (deterministic template covering
  ahead/behind/on-pace vs `avgPriorDaySec`, first-entry-of-day, and empty-history cases).
- [x] 2.4 Implement `sanitizeInsight(raw, summary): string | null` (guardrail pipeline, design §5).
- [x] 2.5 Export from `index.ts`; `npm run build -w @honeydo/shared` and shared tests green (TC-TEST-01).

## 3. API — data model + config

- [x] 3.1 Add the `DailyInsight` model + `User.dailyInsights` back-relation to
  `apps/api/prisma/schema.prisma` (design §3); run `npm run migrate` to create the migration + client.
- [x] 3.2 Add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` (blank/default) to `apps/api/.env.example`
  with a comment that a missing key = deterministic fallback.
- [x] 3.3 Add `@anthropic-ai/sdk` to `apps/api` dependencies (root `npm install`).

## 4. API — Anthropic wrapper + insight service

- [x] 4.1 `AnthropicService` (`apps/api/src/insight/anthropic.service.ts`): reads key/model from
  `ConfigService`; `isEnabled()`; `generate(summary): Promise<string>` with ~4 s `AbortController`
  timeout and the constrained system prompt. Never throws to callers of the insight service (caught).
- [x] 4.2 `InsightService` (`apps/api/src/insight/insight.service.ts`): `getForToday(userId, tz)` and
  `refresh(userId, tz)` — resolve/validate `tz` (default `UTC`), load the user's entries, shape via
  `buildInsightInput`, read/write the `(userId, localDate)` cache (`upsert` on refresh), call
  `AnthropicService` when enabled, run `sanitizeInsight`, and fall back to `fallbackInsight` on any
  disabled/timeout/failure/rejection. Sets `source` + `model` accordingly.
- [x] 4.3 `InsightController` (`apps/api/src/insight/insight.controller.ts`): `GET /insight?tz=` and
  `POST /insight/refresh?tz=`, both `@UseGuards(JwtAuthGuard)` + `@CurrentUser()`, returning the
  `DailyInsight` contract. `InsightModule` wired into `AppModule`.
- [x] 4.4 API `lint`, `typecheck`, and `test` green; add a service spec that asserts fallback when the
  key is absent and cache-hit avoids a second generation.

## 5. Mobile — data hook + api client

- [x] 5.1 Add `getInsight(tz)` and `refreshInsight(tz)` to the mobile api client; send the device zone
  from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- [x] 5.2 Add `hooks/useInsight.ts` (TanStack Query) with a refresh mutation that updates the cache.

## 6. Mobile — Stats insight card

- [x] 6.1 `components/InsightCard.tsx`: shows the sentence + a refresh control, tokens only, calm
  loading and (rare) error/retry states; readable in light + dark (FR-THEME-03, NFR-OBS-01/A11Y-02).
- [x] 6.2 Mount the card at the top of `StatsScreen` above the totals; wire `useInsight`.
- [x] 6.3 Mobile `lint` + `typecheck` green.

## 7. Verify + docs

- [x] 7.1 Run repo `gate` (shared build + API lint/typecheck/test + shared tests) and mobile
  lint/typecheck — all green with no Anthropic key set.
- [ ] 7.2 Manual smoke: on a fresh account the card shows a calm fallback; with history it shows a
  sensible sentence; refresh updates it; (optionally) set `ANTHROPIC_API_KEY` and confirm `source:"llm"`,
  ≤ 200 chars, no emoji.
- [x] 7.3 Update `docs/current-state.md` (newest first) with the implementation entry + FR/NFR/TC IDs.
