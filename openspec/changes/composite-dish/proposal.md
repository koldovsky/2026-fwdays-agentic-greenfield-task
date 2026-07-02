## Why

A user often eats the **same multi-item dish** repeatedly — a protein cocktail (whey + milk),
coffee with cream — and today must re-log every component each time. They want to save a logged
dish once under a name ("protein cocktail") and re-log the whole thing by that name later. This
serves US-2 (fast food logging) by turning a recurring multi-item plate into a one-word `fact` log.

## What Changes

- **Save a logged dish as a named Food-DB product.** After a **multi-item** dish logs, the
  confirmation offers a **"➕ Save as dish"** button. Tapping it asks for a name (free text); the
  reply creates **one** `food_database` row named that, with basis **`portion`** whose macros are the
  dish's components **summed in code** (one portion = the whole dish). Tenant-scoped (invariant #8),
  mirrored to Notion best-effort (US-10).
- **Reuse by name — no new lookup code.** Logging "protein cocktail" (or "2 protein cocktail")
  resolves through the **existing** `lookupFood`/`resolveFood` name match → logs as **`source: fact`**
  with the saved portion macros, scaled by quantity via the existing `reconcileQty` (portion basis).
- The save numbers are **re-read from the `food_log` rows at save time** and summed in code (the DB is
  the memory, invariant #1) — never trusted from chat/UI state and never model-emitted (invariant #2).

## Capabilities

### New Capabilities
- `composite-dish`: save a just-logged multi-item dish as one named `portion`-basis `food_database`
  product (macros = the components summed in code, re-read from the rows), and re-log it by name as a
  `fact` scaled by quantity.

### Modified Capabilities
- `food-photo-logging`: the multi-item plate confirmation gains the **"Save as dish"** affordance
  (a button carrying the just-written row ids) — the entry point to the save flow.

## Impact

- **Code:** `src/food/confirm.ts` (`Confirmation.dish?` payload + button on a >1-row plate),
  `src/bot/bot.ts` (a `food:savedish` callback → pending name question; the name reply creates the
  dish — reuses the one-pending-per-chat clarify store + TTL, ADR-0019), a new save function in
  `src/food/` (re-read rows by id, sum, `foodDatabase.create` as `portion`), `src/food/service.ts` +
  `types.ts` (a `saveDish` service method + a pending `saveDish` Open-Question variant), Notion
  enqueue on the new `food_database` row.
- **No schema/migration:** `food_database` already supports `per: 'portion'` + macros; a composite is
  just a row (no `isComposite` flag in v1 — YAGNI).
- **Invariants:** **#1** (numbers re-read from DB rows at save, not UI/chat state), **#2** (macros
  summed in code, never by the model; the daily total stays the SQL SUM), **#8** (tenant-scoped),
  **#6** (prose mirrors language; `per`/enums stay English). **LLM cost: zero** — save + reuse are
  deterministic (reuse is a name lookup, no estimate call). Memory: the name-pending reuses the
  existing ephemeral store; no new long-lived state.
