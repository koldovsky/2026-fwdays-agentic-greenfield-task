## Why

The router (FR-1) already classifies a `query` intent and resolves the date, but nothing acts on it —
the bot just echoes `intent: query`. **US-4** ("ask the DB") is the payoff of the whole logging track
and the embodiment of the project's first non-negotiable rule — **the database is the memory**: a user
asks "сколько белка сегодня?" / "how many calories today?" and expects an answer computed from a
`SELECT … WHERE date=… SUM` over `food_log`, **never** reconstructed from chat history. food-text now
writes the rows; query is what reads them back.

## What Changes

- **Act on the `query` intent.** Wire the router's `query` output (+ resolved date) into a new path
  that answers from a SQL aggregate.
- **Totals come from the SUM, in code, never the model (invariants #1/#2).** Aggregate `food_log`
  (`kcal`, `protein_g`, `fat_g`, `carbs_g`) for the user + resolved date with a single tenant-scoped
  `aggregate({ _sum })`. The model never emits the numbers; chat history is never consulted.
- **Resolve which nutrient is asked deterministically.** A keyword parser maps RU/UA/EN synonyms
  (белок→protein, калории/ккал→kcal, жир→fat, углеводы→carbs) → the asked field; an unspecified ask
  ("что по сегодня?") returns the **full breakdown**. No LLM call (invariant #5, like the metrics
  parser).
- **Answer with the totals + goal context.** Render the answer in code (numbers from the SUM), prose
  mirroring the user's language; when the user has onboarding **targets** (`users.target_*`), show
  `logged of goal` and the remainder. An empty day answers honestly ("nothing logged yet"), not zero.
- **Single resolved date only.** Period/rollup queries (this week/month) are the `reviews` capability.

**Explicitly out of scope (deferred):** weekly/monthly period rollups (→ `reviews`), listing the
individual items eaten (this slice answers nutrient **totals**, not an itemized log), corrections
(→ `correction`), the ephemeral ask mechanic (→ `clarify`).

## Capabilities

### New Capabilities
- `nutrition-query`: answer a natural-language nutrition question for a single resolved date by
  aggregating `food_log` in SQL (tenant-scoped SUM) → resolving the asked nutrient(s) in code →
  rendering totals + goal context in the user's language, with the numbers always from the SUM.

### Modified Capabilities
<!-- none — the router/message-router contract is unchanged; query consumes its existing `query` output. -->

## Impact

- **Code:** new `src/query/` (parse-ask, aggregate, answer, service); `src/bot/bot.ts` wires the
  `query` path (mirrors the food-text `log` / metrics `metric` wiring); reuses `src/router` output,
  `src/db/tenancy` (`tenantWhere`). No LLM seam used (deterministic parse + code-rendered answer).
- **Data:** read-only — one `food_log` aggregate per query + one `users` target read. No writes, no
  migration.
- **Invariants touched:** #1 (answer from a SQL SELECT, never chat history), #2 (totals from the SUM,
  never hand-summed/model-emitted), #5 (no LLM call on this path), #6 (prose mirrors language, fields
  stay English), #8 (the aggregate is tenant-scoped — only the asking user's rows).
- **LLM cost:** **zero** model calls on the query path. No agent loop.
- **Memory:** read-only aggregate; no new long-lived state; within the 512 MB bot cap.
