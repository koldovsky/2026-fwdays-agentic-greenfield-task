## 1. Types + ask parser (pure, no I/O)

- [x] 1.1 Add `src/query/types.ts`: `Nutrient` (`'kcal' | 'protein' | 'fat' | 'carbs'`), `DayTotals` ({ kcal, proteinG, fatG, carbsG, entryCount }), `Targets` (nullable per-nutrient, from `users.target_*`), `QueryAnswer` ({ text }), `QueryService`, `RoutedQuery` (resolved `date`), `QueryClient = Pick<PrismaClient, 'user' | 'foodLog'>`.
- [x] 1.2 Add `src/query/parseAsk.ts`: `parseAsk(text)` — RU/UA/EN synonym map (белок/протеин/protein→protein; калори/ккал/kcal/calorie→kcal; жир/fat→fat; углевод/carb→carbs) → an ordered `Nutrient[]` subset; no keyword → all four (full breakdown). Word-boundary anchored (reuse the metrics-parser lesson: no mid-word substring matches). Explicit return type; no LLM.

## 2. Aggregate (DB, tenant-scoped)

- [x] 2.1 Add `src/query/aggregate.ts`: `sumForDate(client, userId, date)` — one `foodLog.aggregate({ where: tenantWhere(userId, { date }), _sum: { kcal, proteinG, fatG, carbsG }, _count: true })`; coerce the Decimal sums to numbers at this single boundary; null `_sum` (empty day) → zeros + `entryCount: 0`. Explicit `DayTotals` return. No N+1, no row fetch.

## 3. Answer + service

- [x] 3.1 Add `src/query/answer.ts`: `buildAnswer(text, totals, targets, asked)` — per asked nutrient, `logged of goal` + remaining when the target is non-null, else the bare total; an empty day (`entryCount 0`) returns an honest "nothing logged" reply (not `0`). Numbers code-rendered (kcal Int, grams 1 dp); prose mirrors language (reuse the `detectLang` shape); field names stay English.
- [x] 3.2 Add `src/query/service.ts`: `createQueryService` → `answerQuery(chatId, text, routed)` — resolve user id + targets from chat_id (tenancy) → parse the ask → `sumForDate` → `buildAnswer`. Orchestration only; no inline SQL; no LLM call.

## 4. Bot wiring

- [x] 4.1 In `src/bot/bot.ts`: route the post-onboarding `query` intent to `answerQuery`, reply with the answer. Keep the existing echo for the still-unbuilt intents. Wire `QueryService` through `BotDeps`; construct it in `index.ts`.

## 5. Tests (verify the invariants)

- [x] 5.1 `test/query/parseAsk.test.ts`: RU/UA/EN nutrient synonyms → fields; no keyword → all four; word-boundary (no mid-word false-positive); mixed-language ask. (invariant #5).
- [x] 5.2 `test/query/aggregate.test.ts`: the returned totals equal the `_sum` (mocked) and are NOT reduced from rows; empty day → zeros + entryCount 0; tenancy (aggregate where carries user_id). Fake Prisma. (invariants #2/#8).
- [x] 5.3 `test/query/answer.test.ts`: logged-of-goal + remaining when target set; bare total when target null; empty day → honest "nothing logged" (not 0); specific nutrient vs full breakdown; prose mirrors language while fields stay English. (invariants #1/#2/#6).
- [x] 5.4 `test/query/service.test.ts`: "вчера" aggregates the router-resolved date; tenancy (user resolved from chat_id; aggregate scoped to that user). Plus `test/bot/bot.test.ts` query-routing. Fake Prisma.

## 6. Review (maker ≠ checker)

- [x] 6.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes). Resolve every finding before commit. No self-approval. (Opus reviewer returned CLEAN on both axes — no findings.)
