## Context

The router (`src/router`) classifies `query` and resolves `{ date }` (user TZ, incl. `вчера`), but
extracts no nutrient field, and `src/bot/bot.ts` only echoes the intent. food-text writes `food_log`
rows (`kcal` Int, `protein_g`/`fat_g`/`carbs_g` Decimal) and onboarding persists per-day targets on
`users` (`target_kcal`, `target_protein_g`, `target_fat_g`, `target_carbs_g`). The tenancy helper
(`tenantWhere`) and the Decimal→number boundary pattern already exist. This change adds the
`src/query/` module that turns a `query` classification into an answer computed **from SQL**, not chat
— the literal embodiment of invariant #1 (the DB is the memory). It is the read side of US-4/M3.

## Goals / Non-Goals

**Goals:**
- Answer a nutrition question for a single resolved date from a tenant-scoped `food_log` SUM.
- Resolve which nutrient(s) the user asked in code (no LLM); default to the full breakdown.
- Render totals + goal context (logged of target, remaining) in the user's language, numbers from SQL.

**Non-Goals (deferred):**
- **Period/rollup** queries (this week, this month) → `reviews`.
- **Itemized** answers ("what did I eat") — this slice answers nutrient **totals**, not a row list.
- **Corrections** → `correction`; the **ask** mechanic → `clarify`.

## Decisions

**1. Totals come from a single tenant-scoped SQL aggregate (invariants #1/#2/#8).**
`sumForDate(client, userId, date)` → `client.foodLog.aggregate({ where: tenantWhere(userId,{date}),
_sum: { kcal, proteinG, fatG, carbsG } })`. Returns a `DayTotals` ({ kcal, proteinG, fatG, carbsG,
entryCount }) with the Decimal sums coerced to numbers at this one boundary; a day with no rows yields
zeros + `entryCount: 0`. The model never sees food_log and never emits these numbers.
- *Why:* one `aggregate` is the DB doing the SUM — no N+1, no per-row fetch, no hand-summing. Tenancy
  rides on `tenantWhere` so the filter can't be dropped. Alternative (fetch rows + reduce in JS) would
  hand-sum and pull more data — rejected.

**2. The asked nutrient is parsed in code (no LLM, invariant #5).** `parseAsk(text)` scans RU/UA/EN
synonyms → a set of requested fields: белок/протеин/protein→`protein`, калори/ккал/kcal/calorie→`kcal`,
жир/fat→`fat`, углевод/carb→`carbs`. No keyword (or a generic "сколько сегодня?") → **all** fields
(full breakdown). Returns a stable ordered subset of `{ kcal, protein, fat, carbs }`.
- *Why:* the question is keyword-shaped; a parser is free, deterministic, testable, and matches the
  metrics-parser precedent. An LLM extract would add cost + non-determinism for no gain. Module-level
  heuristic → recorded here, no ADR.

**3. The answer is rendered in code; targets give it meaning.** `buildAnswer(text, totals, targets,
asked)` formats each asked nutrient as `logged of goal` + remaining when a target exists, else the
bare total; prose mirrors the detected language (reusing the `detectLang` bucket shape), field names
stay English in any structural sense. An empty day (`entryCount 0`) answers honestly ("за сегодня ещё
ничего не записано"), not a misleading `0 г`.
- *Why:* the answer is mostly numbers, which invariant #2 says must come from code — a template is the
  honest, zero-cost path. Showing vs-target turns a raw total into the coaching signal the user wants
  (how much protein is left), and the targets are already on `users`. The honest-empty case avoids
  implying zero intake when nothing was logged.

**4. Single resolved date.** query reads exactly the router's resolved date. A multi-day/period ask is
out of scope and belongs to `reviews`, which has the rollup machinery; query stays a one-date SUM.

## Risks / Trade-offs

- **Ambiguous asks.** "как успехи?" matches no nutrient keyword → full breakdown (a safe superset),
  not an error. A user asking for a nutrient we don't track gets the full breakdown too. Acceptable —
  the answer is honest and complete; sharper intent disambiguation is `clarify`'s domain.
- **No targets yet.** A user who hasn't completed onboarding has null `target_*`; the answer degrades
  to bare totals (no `of goal`), which is correct, not an error.
- **Decimal rounding.** `_sum` of Decimal(7,2) values is exact in the DB; coercion to number for
  display rounds to a readable precision (kcal Int, grams 1 dp) in code — never re-summed.
- **Memory / cost / build-off-box.** Read-only; one aggregate + one target read per query; zero LLM
  calls, no agent loop; no new deps, no migration. Within the 512 MB bot cap.
