## 1. Types & confirmation (reuse, no new lang copy)

- [x] 1.1 Add correction shapes to `src/food/types.ts`: a `RoutedCorrection` (same fields food-text
      reads — `date`, `product?`, `quantity?`, `unit?`) and a `correctLast` method on `FoodService`.
- [x] 1.2 In `src/food/confirm.ts`, add `buildCorrectionConfirmation(text, row)` and
      `noEntryReply(text)`, reusing the module's existing `detectLang` + `macroLine` + estimate note —
      add only a `CORRECTED_VERB` record (`uk: 'Виправив'`, `ru: 'Исправил'`, `en: 'Corrected'`).
      Do **not** introduce a new `detectLang`/`Lang`/regex copy (duplication gate — owned by `shared-lang`).

## 2. Tenant-scoped update + correction logic

- [x] 2.1 In `src/food/write.ts`, add `updateFoodLog(client, userId, id, resolved)` that updates the
      row via `updateMany({ where: tenantWhere(userId, { id }) , data: … })` so the `user_id` filter is
      enforced on the update (invariant #8); scale macros in code exactly like `writeFoodLog`.
- [x] 2.2 Add `findLastFoodLog(client, userId)` (most recent row by `id DESC`, tenant-scoped) — colocate
      with the other `food_log` reads.
- [x] 2.3 Create `src/food/correct.ts`: load the last entry (none → `noEntryReply`); branch on
      `routed.product` — quantity-only path rescales the existing basis via
      `perForUnit`/`scaleFactor`/`unscaleMacros`/`macroBaseFromRow`/`reconcileQty`/`scaleMacros`
      (design D4); product path re-resolves via `resolveFood` (design D5); update the row in place and
      return `buildCorrectionConfirmation`.
- [x] 2.4 Wire `correctLast` into `createFoodService` (`src/food/service.ts`): resolve the user from
      `chatId` (null → null reply), delegate to `correct.ts`.

## 3. Bot dispatch

- [x] 3.1 In `src/bot/bot.ts`, dispatch the `correction` intent to `deps.food.correctLast(...)` before
      the generic echo fallback; reply with the confirmation (reuse `replyConfirmation` so a product
      correction that lands on `estimate` still offers add-to-Food-DB consistently).

## 4. Verification (per touched invariant)

- [x] 4.1 `test/food/correct.test.ts`: quantity-only rescale — corrected macros equal the code
      `base × factor` (invariant #2) and the row is updated in place (same `id`, no insert), with **no**
      LLM call made (invariant #5).
- [x] 4.2 Product correction re-resolves via `resolveFood` (fact path and estimate path), updating
      `entry_name`/`source`/`food_db_id`/macros; estimate is surfaced honestly in the confirmation.
- [x] 4.3 No-entry path returns the localized "nothing to correct yet" reply.
- [x] 4.4 Tenancy: a correction updates only the acting user's most recent row, never another user's
      (invariant #8) — assert the `updateMany` where-clause carries `user_id`.
- [x] 4.5 Language mirroring: RU/UA/EN message → matching prose; stored `meal`/`source` stay English
      literals (invariant #6).
- [x] 4.6 Extend `test/food/service.test.ts` for `correctLast` orchestration (unknown chat → null) and,
      if needed, `test/bot/bot.test.ts` for the `correction` dispatch branch.
- [x] 4.7 Run `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` — all green.

## 5. Review (maker ≠ checker)

- [x] 5.1 Hand the diff to a **separate** reviewer subagent (the `review` skill: Standards + Spec
      axes). Resolve every finding before commit — no self-approval.
