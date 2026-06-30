## Why

The router (FR-1) already classifies a `metric` intent and resolves the date, but nothing acts on
it — the bot just echoes `intent: metric`. **US-7** ("log body metrics, see trends") is the spine of
milestone **M5 (body)**: a user types terse RU/UA/EN shorthand ("вес 89.2, талия 90", "weight 89.2
waist 90") and expects the measurement recorded and compared against their last like measurement so
they can see the cutting trend. Onboarding already seeds a first `body_metrics` weight row (ADR-0016);
this change makes ongoing metric logging + trend diffs a first-class flow. Without it the body track
has no data, and `reviews` (M6) and `progress-photo` (M5) have no metric history to read.

## What Changes

- **Act on the `metric` intent.** Wire the router's `metric` classification (+ resolved date) into a
  new body-metrics path that writes/updates a `body_metrics` row.
- **Parse metric values in code, no LLM.** A deterministic synonym→column parser maps RU/UA/EN
  keyword+number pairs to the `body_metrics` columns (`weightKg`, `waistCm`, `chestCm`, `hipsCm`,
  `bicepCm`, `thighCm`). These are keyword:number pairs — a parser is cheaper, deterministic, and
  testable (invariant #5, like food-text's meal inference). The model never emits the numbers.
- **One row per (user, date).** Upsert the `body_metrics` row for the router-resolved date (user TZ,
  incl. `вчера`/`yesterday` back-date); a second message the same day merges fields, not duplicates.
- **Trend diffs compare like-with-like vs the most recent PRIOR entry** that carried that field —
  per metric, never vs the start. Weight diffs against the last weight, waist against the last waist.
- **Confirm** the new values + per-metric deltas (↓0.8 kg since the prior entry), numbers from code,
  prose mirrors language. Columns/enums stay English.
- **Expose staleness** (days since each metric was last logged) as a reusable read for the future
  `reviews` change — but review generation itself is out of scope here.

**Explicitly out of scope (deferred):** progress photos (→ `progress-photo`), the ephemeral
open-question / ask mechanic (→ `clarify`), review/rollup generation and staleness *reminders*
(→ `reviews`). metrics is **log-by-default**: it records what it can parse and skips what it can't.

## Capabilities

### New Capabilities
- `body-metrics`: parse a terse RU/UA/EN body-metrics message → map to `body_metrics` columns in code
  → upsert one tenant-scoped row for the resolved date → compute per-metric like-with-like deltas vs
  the most recent prior entry → confirm with the new values + deltas; expose per-metric staleness.

### Modified Capabilities
<!-- none — the router/message-router contract is unchanged; metrics consumes its existing `metric` output. -->

## Impact

- **Code:** new `src/metrics/` (parse, write/upsert, trend, service, confirm); `src/bot/bot.ts` wires
  the `metric` path (mirrors the food-text `log` wiring); reuses `src/router` output, `src/db/tenancy`
  (`tenantWhere`). No LLM seam used (deterministic parse).
- **Data:** new/updated `body_metrics` rows (upsert per user+date). **No migration** — the table
  already exists from `data` (and onboarding already writes weight to it).
- **Invariants touched:** #1/#2 (numbers + deltas from code, never the model, never chat history),
  #5 (no LLM call at all on this path — deterministic parse), #6 (prose mirrors language, columns
  English), #8 (every row carries `user_id`, enforced at the service layer), #9 (body data is
  sensitive — keep DB access tight, avoid logging raw values).
- **LLM cost:** **zero** model calls on the metric path. No agent loop.
- **Memory:** no new long-lived state; within the bot's 512 MB cap.
