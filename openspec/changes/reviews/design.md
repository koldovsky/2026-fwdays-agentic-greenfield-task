## Context

`reviews` (US-9, M6) is the summarization payoff of every prior logging feature. The `reviews` table
already exists (from `data`): `id, user_id, period (daily|weekly|monthly), period_start, period_end,
body, reviewed_flag, created_at`, unique `(user_id, period, period_start)`. Food totals already have
a SUM seam (`src/query/aggregate.ts sumForDate`); body metrics have history/staleness helpers
(`src/metrics/trend.ts`); the coach voice is a cached system prefix (`src/llm/systemPrefix.ts`); the
router already enumerates `review_trigger` but `dispatch()` has no case for it. There is **no**
scheduler yet — `node-cron` is not a dependency. This change adds the `src/reviews/` module, the
scheduler, and the bot wiring. Constraints: RAM ≤512 MB (invariant #7), one LLM call per review, no
agent loop (#5), numbers in code / prose from model (#1, #2), tenant-scoped (#8).

## Goals / Non-Goals

**Goals:**
- Daily review on `/done` + `review_trigger` (today, user TZ), and a midnight cron fallback that
  guarantees 100% coverage with no doubles (PRD M4).
- Weekly (Sunday) and monthly (month-end) rollups triggered off a generated daily.
- Output faithful to `docs/review-templates.md`: numbers rendered in code, prose from **one**
  structured LLM call in the coach voice, language-mirrored.
- Honest edge-case behavior (empty/partial period, missing baselines).

**Non-Goals:**
- Notion mirroring of reviews — that's `notion-mirror` (M7), which depends on this change.
- A live LLM output/judge eval — deferred to deploy-time (no `ANTHROPIC_API_KEY` in sandbox,
  ADR-0013); the prose call is mocked in unit tests.
- Deduping the pre-existing `resolveUserId` copies — owned by `shared-tenant-resolve`. This change
  only guarantees it adds **no new** copy.
- After-midnight cutoff nuance beyond §8.0's "row takes arrival local date; вчера overrides".

## Decisions

### D1 — Scheduling: one hourly node-cron tick, per-user local-midnight sweep (→ ADR-0020)
A single `node-cron` job (`0 * * * *`) sweeps users; a user whose **local** hour is `00` has a
finished day (their local "yesterday") whose daily review is generated iff no `reviews` row exists
for it. Idempotency (unique key + upsert), not the clock, prevents doubles — so a missed/double tick
is self-healing. Auto reviews push via an injected `send(chatId, text)` callback and store
`reviewed_flag = false`. Alternatives (per-user timers, server-TZ daily cron, per-TZ jobs) and the
rationale are in **ADR-0020**. Memory: one interval + bounded per-tick queries — negligible,
build-off-box unaffected (no new build step).

### D2 — Numbers in code, prose in one LLM call (invariants #1/#2/#5)
`compute.ts` produces a fully-numeric `ReviewStats` (totals, per-day averages, days-hit-protein/fat,
coverage, weight/waist deltas) purely from SQL. `prompt.ts` serializes those numbers + light driver
hints into a user message; `parseStructured` (cached coach prefix, no agent loop) returns a small zod
object of **prose-only** slots (`drivers`, `verdict`/`whatWorked`/`draggedBack`, `focus`). `render.ts`
fills the template's numeric skeleton deterministically and splices the prose. The model never emits a
number; totals are the SUM by construction. Exactly one `messages.create` per review.

### D3 — Aggregation: extend the query SUM seam, don't copy it (rule #12)
Daily reuses `sumForDate`. Weekly/monthly need per-day totals across a range → add
`dailyTotalsForRange(client, userId, start, end)` to `src/query/aggregate.ts` (its one home) using a
**single** `foodLog.groupBy({ by: ['date'], _sum })` (no N+1), tenant-scoped. `compute.ts` derives
averages, days-hit-target, and coverage from that one result set. Body deltas reuse
`src/metrics/trend.ts` history reads; staleness reminders reuse `metricStaleness`.

### D4 — resolveUserId: reuse a shared home, add no copy #5
`resolveUserId` is duplicated across food/metrics/query/progress; `shared-tenant-resolve` (wave 6)
owns collapsing them. To honor the step-7 dup gate *now*, this change extracts the canonical
`resolveUserId(client, chatId): Promise<number | null>` to **`src/db/resolveUser.ts`** (sibling of
`tenancy.ts`, structural client type so any narrow service client satisfies it) and imports it in
`reviews`. It does **not** repoint the four existing copies (that stays `shared-tenant-resolve`'s
scope) — it only ensures reviews consumes the single new shared home rather than writing a fifth
inline `findUnique`. Net effect: one shared home exists, reviews uses it, and
`shared-tenant-resolve` shrinks to "repoint the existing four." Noted for that change.

### D5 — Language: manual = detect from trigger; cron = Russian default (invariant #6)
Manual reviews detect language from the trigger text via `detectLang` (src/util/lang.ts). Cron
reviews have no user text and send no chat history (invariant #1), so they default to Russian — the
same call made in `progress-photo` (D6) when no caption is present. `period`, DB enums, and structural
labels stay English; only prose adapts.

### D6 — Rollups compute from raw rows, not from prior review prose (invariant #2)
"Weekly from the 7 dailies / monthly from the weeklies" governs *when* a rollup fires and *coverage*,
not the source of numbers. Weekly/monthly numbers come from raw `food_log`/`body_metrics` groupBy over
the period; stored review rows are consulted only for existence/coverage, never parsed for totals.
Monthly's per-week trend table is computed from raw rows grouped into ISO weeks within the month.

### D7 — Module shape (mirror food/metrics/query)
`src/reviews/`: `types.ts` (`ReviewClient` narrow Pick, `ReviewPeriod`, `ReviewStats`,
`ReviewService`), `aggregate.ts` (body-metrics range read; food SUM comes from the query seam),
`compute.ts` (pure number math + boundary helpers: `isSunday`, `isLastDayOfMonth`, week/month range
in user TZ), `schema.ts` (zod prose schema), `prompt.ts` (numbers→user message), `render.ts`
(template fill + prose splice, per period), `write.ts` (tenant-scoped upsert on the unique key),
`service.ts` (`generateDaily`/rollup orchestration, `resolveUserId`), `scheduler.ts`
(`startReviewScheduler(deps, send)` — the node-cron job + sweep). Small, single-purpose, explicit
return types, guard clauses (backend-conventions).

## Risks / Trade-offs

- **[Up-to-59-min fallback latency]** → Accepted per ADR-0020; the manual `/done` path is instant and
  a fallback review has no sub-hour SLA.
- **[Proactive send to a blocked/deleted chat throws]** → the scheduler wraps each user's
  send/generate in try/catch so one failed user never aborts the sweep; log at warn without raw body
  values (invariant #9).
- **[Sweep cost as users grow]** → per tick, one users scan + one aggregate per *due* user only;
  bounded and cheap at this scale. If the user base ever grows, the tick can filter to users whose tz
  is near midnight before aggregating.
- **[LLM returns numbers in prose despite instructions]** → the numeric skeleton is rendered in code
  and is the source of truth; prose slots are separate fields, so a stray number in prose can't
  corrupt the totals. Tests assert totals == SUM independent of the (mocked) prose.
- **[Partial rollup coverage misread as complete]** → `compute.ts` always emits explicit coverage
  (`loggedDays/periodDays`) and `render.ts` surfaces it; averages divide by logged days only.

## Migration Plan

- Additive only: no schema change (the `reviews` table exists). Add `node-cron` + `@types/node-cron`
  to `package.json`; the image is built off-box (CI → GHCR, ADR-0006) — no build step runs on the
  host. Deploy is the standard Coolify pull; the scheduler starts in `src/index.ts main()` alongside
  `bot.start()`. Rollback = redeploy the prior image; no data migration to undo (review rows are
  additive and idempotent).

## Open Questions

- None blocking. Dominant-language detection for cron reviews is intentionally simplified to a
  Russian default (D5) rather than persisting a per-user language preference; if users complain, a
  `users.lang` column is a later, separate change.
