## Context

Food logging resolves a name against the Food Database (`lookupFood` → `resolveFood`, own + global
via `catalogWhere`): a hit is `source: fact` with the catalog macros, scaled by `reconcileQty` onto
the row's `per` basis. `saveLoggedFoodToCatalog` already turns **one** logged estimate row into a
user-owned `food_database` row. The multi-item plate path (`food-photo-logging`) writes one
`food_log` row per item and now shows a code-summed reply total (no stored total). What's missing is a
way to save a **whole dish** (its components) as **one** reusable named product.

The naming interaction reuses the existing **one-pending-per-chat** mechanic: `handleText` gates on
onboarding, then a pending Open Question (ephemeral clarify store, lazy TTL — ADR-0019), else routes
fresh. A "save as dish" flow is exactly a pending free-text question whose answer is the dish name.

## Goals / Non-Goals

**Goals:**
- Save a just-logged multi-item dish as one `portion`-basis `food_database` row (macros = components
  summed in code, re-read from the `food_log` rows).
- Re-log it by name as a `fact`, quantity-scaled — with **no** new lookup/estimate code.
- Zero schema change, zero LLM call, tenant-scoped, Notion-mirrored.

**Non-Goals:**
- No `isComposite` column / dish-editing / component breakdown on reuse (v1 logs the summed portion).
- No auto-naming (the user names it) and no saving a single-item "dish" (the button shows only for >1).
- No change to the reuse path — it already works via `resolveFood` name match + `reconcileQty`.

## Decisions

### D1 — A composite dish is a plain `food_database` row, `per: 'portion'`
One portion = the whole dish. Macros = the components' logged kcal/protein/fat/carbs summed. Reuse is
then automatic: `lookupFood` matches the name → `fact`; `reconcileQty` maps "protein cocktail" → 1
portion and "2 protein cocktail" → qty 2. No new table, column, or lookup branch.
- *Alternative — a per-100g composite:* would force weighing the whole cocktail every log; rejected
  (the user chose "one portion = the whole dish").
- *Alternative — a new `dishes` table + join to components:* enables editing/breakdown but needs a
  migration + a reuse path that re-expands components; disproportionate for v1. Rejected (YAGNI).

### D2 — Numbers are re-read from the `food_log` rows at save time (invariant #1/#2)
The save flow holds only **row ids** (pointers), never macros. At save it re-reads those rows
(tenant-scoped) and sums their kcal/protein/fat/carbs **in code** into the portion. The DB is the
memory; the model emits no number. This mirrors `saveLoggedFoodToCatalog` (driven by the row, not
draft state).

### D3 — The save trigger is a button → a pending name question (reuses the clarify store)
`buildPlateConfirmation` attaches a `dish` payload (the just-written row ids + a suggested name from
the caption) when `rows.length > 1`; the bot renders a **"➕ Save as dish"** button with callback
`food:savedish:<ids>` (ids joined compactly; **omit the button** when the joined ids would exceed the
64-byte callback limit — a rare large dish — logged, not truncated). Tapping it sets a **pending
`saveDish` Open-Question variant** (holding the row ids + meal/date, lazy TTL — ADR-0019) and asks
"Name?" in the user's language. The next text message resolves it (the existing
read-and-remove pending path in `handleText`) → `saveDish` service call creates the row → confirms.
- *Alternative — caption keyword / command:* less discoverable; the user chose the button. The
  button+name is also the only option that lets the user pick the name after seeing the logged dish.
- *Alternative — a brand-new ephemeral store for the name:* the clarify store already is the
  one-pending-per-chat home with a TTL; adding a `saveDish` variant reuses it (rule #12).

### D4 — Reuse is the existing pipeline, unchanged
No code for reuse. A saved dish is found by `resolveFood`'s name match and logged as `fact` scaled by
`reconcileQty`. If two rows share the name (own + global), the existing multi-match disambiguation
(clarify) already handles it. Name save uses find-or-update by `(userId, name)` so re-saving the same
dish updates rather than duplicating (a second save of "protein cocktail" refreshes its macros).

## Risks / Trade-offs

- **Callback 64-byte limit for many ids** → guard: omit the button (log a note) when the id list
  would overflow; a huge single dish is rare and can still be saved item-by-item. Mitigation keeps the
  payload stateless (no extra store) for the common 2–4 item case.
- **Name collision with an existing product** → find-or-update by `(userId, name)` (case-insensitive)
  so a re-save refreshes, and a clash with a *global* catalog name still creates a user-owned row
  (own-preferred in lookup) — no silent overwrite of someone else's data (invariant #8).
- **Stale row ids** (rows corrected/deleted between log and save) → re-read at save; a missing row is
  skipped and the sum reflects what still exists; if none remain, reply honestly and save nothing.
- **Pending name vs a real food message** → the pending question is consumed read-and-remove on the
  very next text (existing mechanic); TTL expiry drops it (no dish saved), never mis-logs.

## Migration Plan

Pure code — **no** Prisma migration, **no** new dependency. Ships in the normal image build. Rollback
= redeploy prior image; any dishes already saved are ordinary `food_database` rows and keep working.

## Open Questions

- Suggested-name prefill from the caption is best-effort; if empty the prompt is a bare "Name?" — fine
  for v1.
