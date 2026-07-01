## Context

The `router` change already classifies follow-ups like "нет, 300 не 200" as the `correction`
intent and emits the same fields a `log` carries (`date`, `product?`, `quantity?`, `unit?`).
`bot.ts` currently echoes the intent. The food domain (`src/food/`) already has the full machinery
this change needs: `resolveFood` (Food DB match → `fact`, miss → one structured `estimate` call),
`scale.ts` (`perForUnit` / `scaleFactor` / `scaleMacros` / `unscaleMacros` / `macroBaseFromRow`),
`tenantWhere`, and the localized confirmation helpers in `confirm.ts`. `food_log` rows carry their
own scaled macros, `qty`, `unit`, `source`, `food_db_id`, and an autoincrement `id`.

This change adds the **act-on** behavior for `correction`, reusing that machinery — no new external
dependency, no schema change.

## Goals / Non-Goals

**Goals:**
- Update the user's most recent `food_log` row **in place** (same `id`) from a `correction` message.
- Quantity-only correction: rescale the existing entry's basis in code — **zero** LLM calls.
- Product correction: re-resolve via the existing `resolveFood` path, then update the row.
- Confirm the corrected value in the user's language, reusing existing confirmation helpers (no new
  `detectLang` copy).

**Non-Goals:**
- The ephemeral open-question / inline-keyboard clarify mechanic (owned by `clarify`).
- Correcting **body-metric** entries (no dependency on `metrics`; food track only).
- Correcting an entry other than the most recent (no entry picker / history navigation).
- Extracting the duplicated `detectLang` (owned by `shared-lang`).

## Decisions

### D1 — Correction lives in the food domain, not a new module

`correctLast(chatId, text, routed)` is added to `FoodService`; the logic lives in a new
`src/food/correct.ts`; `bot.ts` dispatches the `correction` intent to it. Rationale: it operates on
`food_log` and reuses `resolveFood` + `scale.ts` + `confirm.ts` wholesale. A separate `src/correction/`
module would re-export half of `src/food/` and fork the confirmation path. *Alternative considered:*
a generic correction module spanning food + metrics — rejected, no `metrics` dependency and the two
write very different rows; revisit only if a metric-correction story lands.

### D2 — "Most recent entry" = highest `id`, tenant-scoped

The last entry is `food_log` `WHERE user_id = U ORDER BY id DESC LIMIT 1`, read through the tenancy
layer. `id` (autoincrement) is monotonic per insert, so it is a driftless "latest" with no
same-millisecond tie risk that `created_at` alone could have. *Alternative:* `created_at DESC` —
equivalent for inserts but admits ties; `id` is simpler and exact.

### D3 — Quantity-only vs product correction is keyed off `routed.product`

If `routed.product` is **absent** (router parsed only a new number) → quantity-only path: keep the
row's product/basis, rescale. If `routed.product` is **present** → product path: re-resolve. This
mirrors how `logFood` already treats the routed fields and needs no new router output.

### D4 — Quantity rescale recovers the basis from the existing row (reuse, no model)

The basis is recovered with the existing helpers, so corrected numbers are code-computed exactly
like logging (invariant #2):
1. `per = perForUnit(row.unit)`
2. `oldFactor = scaleFactor(Number(row.qty), per)`
3. `base = unscaleMacros(macroBaseFromRow(row), oldFactor)` — recover the per-basis macros
4. `newQty = reconcileQty(routed.quantity, row.unit, per)` — reuse the same qty reconciliation logging uses
5. `newMacros = scaleMacros(base, scaleFactor(newQty, per))`
6. `UPDATE` the row: `qty = newQty`, the four macro columns = `newMacros` (everything else unchanged)

Recovering the basis from the row (rather than re-reading `food_database` for a `fact` entry) keeps
one uniform path for both `fact` and `estimate` rows and avoids an extra query; the unscale→rescale
round-trip is within the `Decimal(7,2)` column tolerance the logging path already accepts.

### D5 — Product correction reuses `resolveFood`, then updates instead of inserts

The product path runs the **same** `resolveFood(prisma, anthropic, userId, parsed)` the logging path
uses (so Food DB match → `fact`, miss → exactly one structured `estimate` call — invariant #5), with
`parsed.qty` defaulting to the existing row's `qty` when the correction names only a product. It then
**updates** the existing row's `entry_name` / `qty` / `unit` / macros / `source` / `food_db_id`
rather than inserting. The write goes through a tenant-scoped update helper in `src/food/write.ts`
(sibling to `writeFoodLog`) so the `user_id` filter is enforced on the update (invariant #8) — a
Prisma `updateMany({ where: tenantWhere(userId, { id }) })` guarantees the row belongs to the user.

### D6 — Correction confirmation lives inside `confirm.ts` (duplication gate)

A `buildCorrectionConfirmation(text, row)` is added **in `src/food/confirm.ts`**, reusing that
module's existing `detectLang` + `macroLine`, with a `CORRECTED_VERB` record
(`uk: 'Виправив'`, `ru: 'Исправил'`, `en: 'Corrected'`). This adds **no** new language-detection
copy — the triple-copy dedupe stays the sole responsibility of `shared-lang`. The estimate note is
reused so a product correction that lands on `estimate` is surfaced honestly. A `noEntryReply(text)`
localized "nothing to correct yet" message is added the same way.

## Risks / Trade-offs

- **Rescale rounding drift** (unscale → rescale a `fact` entry) → within `Decimal(7,2)` tolerance,
  the same precision the logging path already stores; a follow-up could re-read `food_database` for
  `fact` rows if exactness ever matters, but it is not warranted now.
- **"Most recent" may not be the entry the user means** (they could intend an earlier row) → US-5
  scopes correction to the *last* entry; an entry picker is an explicit non-goal. Documented as the
  known limitation.
- **Router mis-parse of the corrected quantity** → reuse `reconcileQty`, which already degrades a
  unit/basis mismatch to one serving rather than scaling by the wrong magnitude.

## Migration Plan

No data-model change, no migration. Pure code: new `correct.ts`, additive exports in `confirm.ts` /
`write.ts` / `service.ts`, one dispatch branch in `bot.ts`. Memory footprint unchanged (no new
long-lived state, no new dependency); image build stays off-box (CI → GHCR, Coolify pulls). No ADR
needed — this introduces no new architectural pattern; it composes existing food-domain decisions.

## Open Questions

None. Scope is deliberately the most-recent food entry; the clarify mechanic and metric corrections
are tracked by other backlog changes.
