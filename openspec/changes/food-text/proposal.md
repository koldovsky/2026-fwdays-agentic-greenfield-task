## Why

The router (FR-1) already classifies a `log` intent, but nothing acts on it — the bot just
echoes `intent: log`. **US-2** ("log food by text") is the first food-track slice and the
spine of milestone **M3 (core logging)**: a user types terse RU/UA/EN shorthand
("200г куриного филе", "2 яйца") and expects the entry recorded with calories/macros so
later queries and reviews have data to read. Without it the DB-as-memory has nothing to
remember.

## What Changes

- **Act on the `log` intent.** Wire the router's `log` output (product, quantity, unit,
  resolved date) into a new food-logging path that writes a `food_log` row.
- **Resolve macros via a unified "resolved food"** ({ name, per, base macros, qty, unit }):
  - **Food DB match** (tenant rows + global catalog) → `source = fact`, base macros from the
    `food_database` row.
  - **Miss** → **one** structured LLM call (through the existing `parseStructured` seam) returns
    base macros per a chosen `per` basis → `source = estimate` (±20–30%), surfaced honestly.
- **Scale in code, never by the model** — `food_log` kcal/macros = base × factor(qty, unit, per).
  These are the row's OWN numbers, not a daily SUM.
- **Infer meal deterministically** from the user-TZ clock (no LLM, no cost).
- **Confirm** the single logged row with its numbers + source tag (fact vs estimate, honestly).
  Never hand-sum a daily total.
- **Offer "add to Food DB"** on the estimate path via an inline-keyboard button that persists the
  resolved base macros as a user-owned `food_database` row.
- **Deterministic dataset eval** for parse→resolve→scale (fact/estimate tagging, scaling math,
  meal inference); live-LLM estimate cases are deploy-time.

**Explicitly out of scope (deferred):** the ephemeral open-question / ask mechanic (→ `clarify`),
daily SUM totals (→ `query`), editing the last entry (→ `correction`), photo plates (→ `food-photo`),
multi-item text. food-text is **log-by-default**; estimate is the fallback, not an ask.

## Capabilities

### New Capabilities
- `food-logging`: parse a single terse food message → resolve macros (Food DB fact or LLM estimate)
  → scale by quantity in code → infer meal → write a tenant-scoped `food_log` row → confirm with the
  row's own numbers + source tag → offer to persist an estimate to the user's Food DB.

### Modified Capabilities
<!-- none — the router/message-router contract is unchanged; food-text consumes its existing `log` output. -->

## Impact

- **Code:** new `src/food/` (parse-adapter, lookup, scale, write, service); `src/bot/bot.ts` wires
  the `log` path + a new namespaced callback handler (`food:` prefix, distinct from `onb:`); reuses
  `src/router` output, `src/db/tenancy` (`tenantWhere` / `catalogWhere`), `src/llm` seam.
- **Data:** new `food_log` rows (insert) + optional user-owned `food_database` rows on add-to-FoodDB.
  **No migration** — both tables already exist from `data`.
- **Invariants touched:** #1/#2 (numbers from code, never hand-summed, never from chat history),
  #3 (every row tagged fact|estimate), #5 (single structured call, no agent loop), #6 (prose mirrors
  language, enums stay English), #8 (every row carries `user_id`, enforced at the service layer).
- **LLM cost:** zero extra calls on the **fact** path (DB-only); **one** call on the estimate path,
  reusing the prompt-cached system prefix. No agent loop, so cost stays bounded.
- **Memory:** no new long-lived state; one estimate call holds only the current message — within the
  bot's 512 MB cap.
