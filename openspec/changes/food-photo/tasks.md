## 1. Extend the LLM seam for images (llm-client)

- [x] 1.1 Add an optional `images?: { data: string; mediaType: string }[]` param to `parseStructured` in `src/llm/structured.ts`. When present, build the user message `content` as `[...image blocks, { type: 'text', text }]`; when absent, keep the current plain string. Still exactly one `messages.create`, cached prefix, no loop (invariants #1/#5).
- [x] 1.2 Update `test/llm/structured.test.ts`: assert a call with an image sends one request whose content is an image block (base64 + media_type) before the text block, and that a call with no image is unchanged (plain text content).

## 2. Vision extraction (food-photo.ts)

- [x] 2.1 Add `src/food/photo.ts`: a zod schema `{ items: PlateItem[] }` where `PlateItem` = `{ name, per (existing FoodPer enum), kcal, proteinG, fatG, carbsG, qty }`; and `estimatePlate(client, imageBase64, caption)` that calls `parseStructured` with the image + a text prompt (caption folded in) and returns the parsed items. One vision call (invariant #5).
- [x] 2.2 Unit-test the schema/prompt shaping in `test/food/photo.test.ts` (with a mocked client returning a fixed multi-item payload): asserts exactly one call, image passed through, items parsed.

## 3. Batched Food DB lookup + per-item resolution

- [x] 3.1 Add `lookupFoodsByNames(client, userId, names)` to `src/food/lookup.ts`: one `foodDatabase.findMany` over all names (own + global via `catalogWhere`, own preferred), reduced in code to a best-match-per-lowercased-name map. No N+1.
- [x] 3.2 Add a photo-resolve helper (in `src/food/photo.ts` or `resolve.ts`) mapping each `PlateItem` → `ResolvedFood`: a name hit → `fromMatch` (`fact`, Food DB macros, `reconcileQty` on the item qty); a miss → a `ResolvedFood` from the item's OWN macros (`source: estimate`, `foodDbId: null`), reusing `unitForPer`/`reconcileQty`. **No extra LLM call on a miss** (invariant #5). Uses the single batched lookup from 3.1.
- [x] 3.3 Test `test/food/photo.test.ts` (resolve): fact-vs-estimate per item, batched lookup issues ONE query for a multi-item plate, miss reuses vision macros with zero extra client calls.

## 4. Multi-item write + confirmation

- [x] 4.1 Add `logPhoto(chatId, caption, imageBase64)` to the food service (`src/food/service.ts` + `FoodService` in `types.ts`): resolve userId (tenant), run `estimatePlate` → resolve items → write ONE `food_log` row per item via existing `writeFoodLog` (code-scaled, `tenantWhere`), meal = `inferMeal(now, tz)`, date = today (user TZ). Returns the confirmation.
- [x] 4.2 Add a multi-item confirmation builder to `src/food/confirm.ts` reusing the existing per-row `macroLine`, `detectLang` (`src/util/lang.ts`), `fmt` (`src/util/num.ts`) — NO new copies (rule #12): one line per row, one honest estimate note if any row is `estimate`, prose language from the caption (default when empty). Enum/structural values stay English (invariant #6).
- [x] 4.3 Test `test/food/service.test.ts` + `test/food/confirm.test.ts`: three items → three tenant-scoped rows with code-scaled macros (no hand-summed total); confirmation lists per-row numbers + estimate note; language mirrors the caption (RU/UA/EN) while enums stay English.

## 5. Telegram photo handler (bot-runtime)

- [x] 5.1 Add a photo-download helper: pick the largest `PhotoSize`, `ctx.getFile()` → fetch bytes from the Telegram file endpoint → base64 IN MEMORY; return the base64 string. Never write to disk (invariant #4).
- [x] 5.2 Register `bot.on('message:photo', ...)` in `src/bot/bot.ts` (+ a `PhotoContext` surface in `bot/types.ts`): onboarding-gate as text does, download bytes, call `deps.food.logPhoto(chatId, caption, base64)`, reply with the confirmation. Skip while onboarding is incomplete.
- [x] 5.3 Wire `logPhoto` into `BotDeps.food` usage; unit-test the handler in `test/bot/bot.test.ts` with a stub food service + fake ctx (photo array + getFile).

## 6. Verify the invariants (tests)

- [x] 6.1 **CRITICAL — image never persisted:** a vitest test that spies on `fs` write paths (`writeFile`/`writeFileSync`/`createWriteStream`) and asserts ZERO calls across a full `logPhoto` run; the download helper returns base64 and receives no path (invariant #4).
- [x] 6.2 **Totals never hand-summed (invariant #2):** assert each row's stored macros equal `scaleMacros(base, factor)` and that `logPhoto` computes no per-plate total.
- [x] 6.3 **Fact vs estimate (invariant #3):** covered by 3.3 — a caption/name catalog match logs `fact`; a visual-only item logs `estimate`.
- [x] 6.4 **Tenancy (invariant #8):** rows written via `tenantWhere`; a second user's catalog/rows are never touched (assert lookup + write both go through the tenant/catalog filter).
- [x] 6.5 **One vision call (invariant #5):** assert `estimatePlate` issues exactly one client call and the miss path adds none.

## 7. Evals (deferred, logged)

- [x] 7.1 Do NOT wire a live vision dataset eval in this change: vision accuracy needs a labeled image set + a key and can't run in-sandbox. Log the skip (consistent with ADR-0013 local-run) and note the follow-up; behavior is covered by the §6 tests.

## 8. Gates, docs, review

- [x] 8.1 Run the static + test gates: `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` — all green.
- [x] 8.2 Duplication gate: cross-check every new symbol/schema/regex against `src/` — confirm no new `detectLang`/`fmt`/number-regex/estimate-schema copy (rule #12); shared things reuse `src/util/*` + existing food helpers.
- [x] 8.3 Update `docs/current-state.md` (M4 food-photo landed; note the `food-photo-ask` split) + flip any AGENTS.md planned→live if applicable; run `npm run docs:check`.
- [x] 8.4 **Maker ≠ checker (mandatory, final):** separate reviewer subagent (Standards + Spec) ran clean on correctness/invariants; two MEDIUM findings resolved before commit — (1) `downloadPhotoBase64` now returns null on non-2xx (never base64 an error body into vision), (2) the invariant-#4 fs-spy re-aimed at the byte-materializing layer (`handlePhoto`/download) in `test/bot/bot.test.ts`. Lows/info (dead `file_id`, silent unparseable plate, plate-global estimate note) logged as non-blocking.
