## Why

Users misspeak: they log "200г куриного филе", then realize it was 300 g, or they named the
wrong product. The router already classifies these follow-ups as the `correction` intent (shipped
in `router`), but today the bot only **echoes** `intent: correction` — nothing is fixed. This
change makes the correction land: the user's most recent food entry is updated in place and the
confirmation reflects the corrected value. Serves **US-5** (§6.5) and completes the M3 core-logging
loop alongside `query`.

## What Changes

- The bot dispatches the `correction` intent to a new `FoodService.correctLast(chatId, text, routed)`
  instead of echoing it.
- **Quantity-only correction** ("нет, 300 не 200", "300г"): the last `food_log` row keeps its
  product/macro basis; macros are **rescaled in code** to the new quantity (reuse `src/food/scale.ts`).
- **Product correction** (a new product is named): the row is **re-resolved** through the existing
  `resolveFood` pipeline (same single-LLM-call estimate-or-fact path as logging), then updated.
- The row is **UPDATE**d in place (same `id`), never duplicated — the corrected entry replaces the
  wrong one, scoped to the acting user.
- A localized **correction confirmation** ("Виправив:" / "Исправил:" / "Corrected:") is added
  **inside `src/food/confirm.ts`**, reusing that module's existing `detectLang`/`macroLine` — no new
  language-detection copy is introduced (the triple-copy dedupe stays owned by `shared-lang`).
- **No-entry path**: if the user has nothing logged yet, reply honestly in their language rather
  than failing.

## Capabilities

### New Capabilities
- `entry-correction`: correct the user's most recent food entry — quantity rescale or product
  re-resolve — updating the existing tenant-scoped `food_log` row in place and confirming the
  corrected value in the user's language.

### Modified Capabilities
<!-- None. The `correction` intent's CLASSIFICATION is already specced in message-router; this
     change adds the ACT-ON behavior as a new capability. Dispatch wiring in bot-runtime is an
     implementation detail, not a requirement change. -->

## Impact

- **Code**: `src/food/correct.ts` (new — correction logic), `src/food/service.ts` (+`correctLast`),
  `src/food/confirm.ts` (+correction confirmation builder, reusing existing `detectLang`),
  `src/food/types.ts` (correction shapes), `src/bot/bot.ts` (dispatch the `correction` intent).
  Tests under `test/food/`.
- **Reuse**: `resolveFood`, `scale.ts` (`perForUnit`/`scaleFactor`/`unscaleMacros`/`scaleMacros`/
  `macroBaseFromRow`), `tenantWhere`, and the existing confirmation helpers — no new modules beyond
  `correct.ts`.
- **Invariants touched**: #2 (corrected numbers computed in code, never the model), #5 (a product
  change is at most one structured LLM call via the existing `resolveFood`; quantity-only does
  **zero** LLM calls — no agent loop), #6 (prose mirrors language; `meal`/`source` stay English),
  #8 (read + update both tenant-scoped via the service layer / `tenantWhere`).
- **Memory & cost**: negligible. Quantity-only corrections add **no** LLM call (pure DB update +
  code rescale); product corrections reuse the already-cached system prefix for the single
  `resolveFood` call. No new dependencies; no new long-lived state.
