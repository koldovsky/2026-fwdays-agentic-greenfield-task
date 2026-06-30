## Context

The router (`src/router`) already classifies `metric` and resolves `{ date }` (incl. the user-TZ
`вчера`/`yesterday` back-date), but its extracted fields (`product`/`quantity`/`unit`) are
food-shaped — it does **not** parse metric values. `src/bot/bot.ts` only echoes the intent. The data
layer (`body_metrics` with nullable Decimal columns + tenancy helper `tenantWhere`) is already in
place, and onboarding already writes a first weight row to it (ADR-0016). This change adds the
`src/metrics/` module that turns a `metric` classification into a persisted, confirmed measurement
with like-with-like trend deltas. It is the body-track foundation (US-7, M5) that `reviews` and
`progress-photo` later read.

## Goals / Non-Goals

**Goals:**
- Act on `metric`: parse values in code, upsert one tenant-scoped `body_metrics` row for the resolved
  date, compute per-metric deltas vs the most recent prior entry, confirm with values + deltas.
- A **deterministic** parser (no LLM) — body metrics are keyword:number pairs.
- A reusable **staleness** read (days since each metric was last logged) for the future `reviews`.

**Non-Goals (deferred to their own backlog changes):**
- The ephemeral open-question / **ask** mechanic → `clarify`. metrics is log-by-default; it records
  what it can parse and silently skips tokens it can't (no interrogation).
- Review/rollup generation and staleness **reminders** → `reviews` (this change only *exposes* the
  staleness read).
- **Progress photos** → `progress-photo`.
- Conditions/free-text notes on a metric row — out of scope; only the six numeric columns are parsed.

## Decisions

**1. Deterministic synonym→column parser (no LLM, invariant #5).** `parseMetrics(text)` scans for
`<keyword> <number>` pairs against a synonym map → the six `body_metrics` columns:
`weightKg` (вес/вага/weight/вс), `waistCm` (талия/талія/waist), `chestCm` (грудь/груди/chest),
`hipsCm` (бедра/стегна/hips), `bicepCm` (бицепс/біцепс/biceps/arm), `thighCm` (бедро/нога/thigh).
Numbers accept `.`/`,` decimals; the parser returns a partial `{ column: value }` map (only the
fields present). Out-of-range values (per onboarding's ranges, e.g. weight 30–400 kg) are dropped.
- *Why:* the model is unreliable at arithmetic and forbidden from emitting the numbers; a keyword
  parser is free, deterministic, and directly unit-testable. Alternative (a structured LLM extract)
  adds a call + non-determinism for no gain on keyword:number input. Module-level heuristic → recorded
  here, no ADR (same shape as food-text's `inferMeal`).

**2. Upsert one row per (user, date).** `writeMetrics(userId, date, parsed)` upserts the
`body_metrics` row for the resolved date: a new date inserts; a same-date second message **merges**
the parsed fields onto the existing row (does not duplicate, does not null out unmentioned fields).
- *Why:* a day is the natural grain (onboarding already created today's row); merging lets a user add
  "талия 90" after "вес 89.2" without clobbering. Prisma has no native composite upsert without a
  unique key, so this is a tenant-scoped `findFirst(userId, date)` → `update` else `create` (the
  read + write both go through `tenantWhere`).

**3. Trend diffs are like-with-like vs the most recent PRIOR entry, per field.** For each just-logged
field, the delta is `new − prior`, where `prior` is the value from the most recent `body_metrics` row
with `date < D` (the logged row's date) that has **that field** non-null — never vs the start, never
cross-metric. Computed in **one** query (`findMany where userId, date < D orderBy date desc`, bounded
`take`), then scanned in code for the first non-null per field (no N+1, no per-field round-trip).
- *Why:* a cut is judged by recent movement, and measurements are sparse/irregular (you weigh more
  often than you measure your thigh), so "prior" must be per-field, not a single prior row. Diffing vs
  the start would hide plateaus. One fetch + in-code scan keeps it a single bounded query.

**4. Confirmation prose mirrors language; numbers + deltas from code (#1/#2/#6).** The confirmation is
built in code (it contains the numbers), per detected language bucket (uk/ru/en, reusing food-text's
`detectLang` shape): each logged metric on its own line with the new value and a signed delta + unit
(`вес 89.2 кг (↓0.8 since 2026-06-22)`); a first-ever metric shows no delta. Column names map to
localized labels in prose; the stored columns stay English.

**5. Staleness is a pure read, exposed not consumed.** `metricStaleness(userId, asOf)` returns, per
column, the days since it was last logged (or `null` if never) — derived from the same history fetch.
metrics doesn't *act* on it; `reviews` will. Kept here so the query lives with the domain it reads.

**6. Sensitive-data hygiene (#9).** Body values are sensitive: the service never logs raw values, and
all reads/writes go through `tenantWhere` so one user can never see another's metrics.

## Risks / Trade-offs

- **Parser recall.** A synonym map misses unusual phrasings ("окружность талии" vs "талия"); an
  unmatched token is silently skipped (log-by-default), so a user could think a value logged when it
  didn't. Acceptable for this slice — the confirmation echoes exactly what *was* parsed, so the user
  sees the omission; richer parsing / an ask is `clarify`'s job.
- **Ambiguous bare numbers.** "89.2" with no keyword can't be attributed to a column — skipped (no
  guessing). A lone weight is the common case and usually carries "вес".
- **Upsert race.** Two near-simultaneous same-date messages could interleave find→write; low risk for
  a single-user chat (messages are serialized per chat by the long-poll handler).
- **Memory / cost / build-off-box.** Zero LLM calls; one bounded history query per metric message; no
  new deps, no migration. Within the 512 MB bot cap; image still builds in CI → GHCR.
