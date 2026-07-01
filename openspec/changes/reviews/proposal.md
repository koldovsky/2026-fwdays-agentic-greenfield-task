## Why

US-9: the user closes out a day and gets an honest review; weeks and months roll up
automatically. This is the payoff of every prior logging feature — food_log and body_metrics
rows exist to be summarized into daily/weekly/monthly coaching feedback. Without it, PRD metric
**M4 "100% of days get a review (manual or midnight fallback), no doubles"** cannot pass, and
the accumulated data has no user-facing loop. All dependencies (`food-text`, `metrics`,
`coach-persona`) are done, so the review generator can now read real totals and speak in the
established honest voice.

## What Changes

- **Manual daily review**: `/done` command **and** the router `review_trigger` intent
  ("готово на сегодня") generate today's review now and mark the day reviewed.
- **Midnight cron fallback**: one `node-cron` hourly job generates a day's review at the user's
  **local** midnight if they never triggered it — guaranteeing 100% coverage. Auto-generated
  reviews are pushed proactively to the chat.
- **Weekly + monthly rollups**: after a daily review, a **Sunday** date also generates the weekly
  review (Mon–Sun); the **last day of the month** also generates the monthly review.
- **Numbers from code, prose from model**: all totals/averages/deltas are computed in code from a
  SQL SUM / groupBy over raw `food_log` and `body_metrics` rows; a single structured LLM call fills
  only the prose slots (drivers, verdict, focus). Output matches `docs/review-templates.md` exactly.
- **Double-generation guard**: the existing `reviews` table unique `(user_id, period, period_start)`
  + `reviewed_flag` makes generation idempotent (upsert on the key).
- **New dependency**: `node-cron` (+ `@types/node-cron`); scheduler wired in `src/index.ts` with a
  proactive `send(chatId, text)` callback.

## Capabilities

### New Capabilities
- `review-generation`: daily/weekly/monthly nutrition reviews — manual (`/done` +
  `review_trigger`) and midnight-cron triggers, code-computed numbers + one-call model prose in the
  coach voice, template-faithful rendering, edge-case handling (empty/partial period, missing delta
  baseline), and the `reviewed_flag` idempotency guard.

### Modified Capabilities
<!-- None. `review_trigger` is already an enumerated intent in message-router (no requirement
     change); the new /done command + scheduler are new behaviors owned by review-generation, not
     changes to bot-runtime's existing requirements. -->

## Impact

- **New code**: `src/reviews/` (types, aggregate, compute, schema, prompt, render, write, service,
  scheduler). Bot wiring: `/done` command + `review_trigger` dispatch case in `src/bot/bot.ts`;
  `ReviewService` added to `BotDeps`; scheduler init + proactive-send callback in `src/index.ts`.
- **Reused seams (no new duplicates, rule #12)**: `src/query/aggregate.ts` food_log SUM (extended
  with a groupBy range helper in its one home), `src/util/{date,lang,num}.ts`,
  `src/db/tenancy.ts`, `src/llm/{structured,systemPrefix,client}.ts`, `src/metrics/trend.ts`
  (staleness + history). `resolveUserId` is reused from a shared home — this change adds **no**
  copy #5 (coordinates with the pending `shared-tenant-resolve`).
- **Dependencies**: adds `node-cron` + `@types/node-cron`. No Prisma schema change — the `reviews`
  table already exists from `data`.
- **Invariants touched**: #1 (DB-as-memory — reviews read only from SQL, never chat history),
  #2 (totals are the SUM, LLM writes prose only), #6 (prose mirrors language; enums/labels stay
  English), #8 (every query tenant-scoped). Stays compliant by construction.
- **Memory / cost (invariant #7)**: one lightweight cron job, no heavy in-memory state; per review,
  exactly **one** cached-prefix LLM call (no agent loop, invariant #5). Cron sweeps users hourly
  with bounded queries — negligible RAM/CPU on the capped host.
