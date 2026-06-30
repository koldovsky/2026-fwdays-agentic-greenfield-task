## 1. Resolve types + scaling (pure, no I/O)

- [x] 1.1 Add `src/food/types.ts`: `ResolvedFood` ({ name, per, base {kcal, proteinG, fatG, carbsG}, qty, unit, source, foodDbId? }) and a `LoggedEntry` confirmation shape. `per`/`source`/`meal` typed off the Prisma enums (English literals).
- [x] 1.2 Add `src/food/scale.ts`: scaling keyed off the `per` BASIS (per100g/per100ml → qty/100; portion/piece/dish → qty), `unitForPer`/`perForUnit` canonical labels, `scaleMacros`/`unscaleMacros` (kcal→Int round, macros 1-dp). Default qty=1 in the service when absent.
- [x] 1.3 Add `src/food/meal.ts`: `inferMeal(now, tz)` → breakfast 05–11 / lunch 11–16 / dinner 16–22 / else snack, computed against the user TZ.

## 2. Resolve macros (fact + estimate)

- [x] 2.1 Add `src/food/lookup.ts`: `lookupFood(prisma, userId, product)` → query `food_database` via `catalogWhere` (own + global). Return the matched row as a fact base, or null. Explicit nullable return type; no N+1.
- [x] 2.2 Add `src/food/estimate.ts`: `estimateFood(client, product)` → one `parseStructured` call with a zod schema `{ per, kcal, proteinG, fatG, carbsG }`. Returns an estimate base. Single call, cached prefix, no agent loop (invariant #5).
- [x] 2.3 Add `src/food/resolve.ts`: `resolveFood(...)` — fact path if lookup hits (source=fact, foodDbId set), else estimate path (source=estimate, foodDbId=null). Produces the unified `ResolvedFood`.

## 3. Write + service

- [x] 3.1 Add `src/food/write.ts`: `writeFoodLog(prisma, userId, resolved, date, meal)` — insert one `food_log` row via `tenantWhere` (user_id on the row), scaled macros, source, foodDbId. Explicit return of the created row.
- [x] 3.2 Add `src/food/addToCatalog.ts`: `saveLoggedFoodToCatalog(prisma, userId, foodLogId)` — reconstruct the per-basis macros from the logged row and insert a user-owned `food_database` row (only un-catalogued estimates qualify). Payload = the row id (no ephemeral draft; the DB is the memory), so it always fits the 64-byte callback limit.
- [x] 3.3 Add `src/food/service.ts`: `createFoodService` → `logFood(chatId, text, routed)` — resolve user id from chat_id (tenancy), resolve → infer meal → write → build the confirmation. Orchestration only; no inline SQL.
- [x] 3.4 Add `src/food/confirm.ts`: build the confirmation prose (row's OWN numbers + honest source tag; NO daily SUM) mirroring the user's language; emit `addToCatalog: { id, label }` on the estimate path so the bot renders the `food:addfdb:<id>` button.

## 4. Bot wiring

- [x] 4.1 In `src/bot/bot.ts`: route the post-onboarding `log` intent to `logFood`, reply with the confirmation (+ keyboard on estimate). Keep the existing echo for the other intents until their changes land.
- [x] 4.2 Add the `food:addfdb:` callback handler (dispatched by prefix, independent of `onb:` so the two never collide). Wired `FoodService` through `BotDeps`; constructed in `index.ts`.

## 5. Tests + eval (verify the invariants)

- [x] 5.1 `test/food/scale.test.ts`: per100g×200 = ×2, per-piece×2, ml scaling, basis round-trip, kcal Int + 1-dp gram rounding, unscale recovery. (invariant #2 — numbers from code).
- [x] 5.2 `test/food/meal.test.ts`: clock→meal boundaries across timezones.
- [x] 5.3 `test/food/resolve.test.ts`: catalog match → source=fact + foodDbId + NO call; miss → source=estimate + foodDbId null + exactly one estimate call (mock the seam) — invariant #3 + #5.
- [x] 5.4 `test/food/service.test.ts`: tenancy (row carries user_id), "вчера" back-date lands on the router-resolved date, confirmation shows the single row's numbers and no daily total, estimate offers add-to-catalog, saveToCatalog reconstructs the base (invariants #1/#2/#8). Fake Prisma. Plus `test/bot/bot.test.ts` log-routing + callback.
- [x] 5.5 Added `evals/datasets/food-scale.jsonl` + `runFoodScale` in `evals/run.ts` (deterministic, no key). Live-LLM estimate/parse cases are deploy-time (no key in sandbox) — `npm run evals` is the deploy-time refresh; the key-less `check:evals` ratchet stays green (baseline unchanged).

## 6. Review (maker ≠ checker)

- [x] 6.1 Hand the diff to a SEPARATE reviewer subagent (the `review` skill: Standards + Spec axes). Resolve every finding before commit. No self-approval. (Reviewer flagged 2 MAJOR scaling gaps + 2 MINOR; all resolved via `reconcileQty` + `CatalogResult`/`catalogReply`; re-review returned CLEAN.)
