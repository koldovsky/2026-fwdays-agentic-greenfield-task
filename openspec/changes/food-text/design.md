## Context

The router (`src/router`) already classifies `log` and extracts `{ product, quantity, unit, date }`
(date resolved in code against the user TZ), but `src/bot/bot.ts` only echoes the intent. The data
layer (`food_log`, `food_database` with a `per` basis enum, tenancy helpers `tenantWhere` /
`catalogWhere`) and the LLM seam (`parseStructured` — one cached-prefix call, no agent loop) are
already in place. This change adds the `src/food/` module that turns a `log` classification into a
persisted, confirmed entry. It is the first food-track slice (US-2, M3) and the foundation the
`query`, `correction`, `clarify`, and `food-photo` changes build on.

## Goals / Non-Goals

**Goals:**
- Act on `log`: resolve macros (Food DB fact or LLM estimate), scale in code, infer meal, write one
  tenant-scoped `food_log` row, confirm with the row's own numbers + honest source tag.
- One **unified resolved-food shape** so fact and estimate paths converge before scaling/writing.
- Persist an estimate to the user's Food DB on demand (inline button), so repeat logs become facts.
- A deterministic dataset eval for parse→resolve→scale that needs no API key.

**Non-Goals (deferred to their own backlog changes):**
- The ephemeral open-question / **ask** mechanic → `clarify`. food-text is log-by-default; on any
  ambiguity it logs the best `estimate` (the precision-first fallback), it does not ask.
- Daily/period **SUM totals** → `query`. Editing the last entry → `correction`. **Photo** → `food-photo`.
- **Multi-item** text ("2 яйца и тост"): the router emits a single product; food-text logs that one.

## Decisions

**1. Unified `ResolvedFood` = `{ name, per, base: {kcal, proteinG, fatG, carbsG}, qty, unit, source, foodDbId? }`.**
Both paths produce this shape, then a single `scale()` + `write()` runs once.
- *Fact:* `lookupFood(userId, product)` queries `food_database` via `catalogWhere` (own + global),
  base = the matched row, `source = fact`, `foodDbId` set. Zero LLM calls.
- *Estimate:* `estimateFood(product)` issues **one** `parseStructured` call returning
  `{ name, per, kcal, proteinG, fatG, carbsG }` (base per the chosen `per` basis), `source = estimate`,
  `foodDbId = null`.
- *Why:* keeps the scale/write/confirm code path identical for both sources; the only branch is how
  `base` is obtained. Alternative (separate end-to-end paths) duplicates scaling + write logic.

**2. Scaling is pure code, never the model (invariants #2/#5).** `scaleFactor(qty, unit, per)`:
`per100g`/`per100ml` → `qty / 100` (weight/volume units); `portion`/`piece`/`dish` → `qty` (a count).
A small unit normalizer maps `г|g|грамм`→grams, `мл|ml`→ml, bare count / `шт`→count; an unrecognized
unit with a weight base falls back to treating qty as grams, otherwise as a count. Missing qty
defaults to `1` of the base `per`. kcal is rounded to Int (schema), macros kept Decimal.
- *Why:* the model is unreliable at arithmetic and forbidden from emitting final numbers; deterministic
  scaling is also directly unit-testable (the eval's core).

**3. Meal inferred from the user-TZ clock, in code, no LLM.** `inferMeal(now, tz)`:
05–11 `breakfast`, 11–16 `lunch`, 16–22 `dinner`, else `snack`.
- *Why:* the router doesn't classify meal and asking would violate log-by-default; a clock heuristic
  is free, deterministic, and good enough (a user can correct via `correction` later). Alternatives —
  an extra LLM field (cost + non-determinism) or always `snack` (less useful for reviews) — are worse.
  Module-level heuristic, not a stack decision → recorded here, no ADR.

**4. Add-to-Food-DB via a namespaced callback, row-id payload.** The estimate confirmation attaches
an inline button `food:addfdb:<foodLogId>` whose payload is just the logged row's id. On tap the
handler re-reads that `food_log` row (tenant-scoped via `tenantWhere`), reconstructs the per-basis
macros (`unscaleMacros`), and inserts a `food_database` row with `user_id` set — no ephemeral draft
state needed (distinct from the `clarify` open-question mechanic, which lands later). Prefix
`food:addfdb:` is checked before `onb:` so the two handlers never collide.
- *Why:* the DB is the memory (invariant #1) — driving off the row id rather than encoding the base in
  the callback keeps it self-contained AND always inside Telegram's 64-byte `callback_data` limit (an
  integer id never overflows, unlike a `name|per|kcal|…` payload for a long product name). The catalog
  offer is best-effort — the entry is already logged, so it never blocks the log.

**5. Confirmation prose mirrors language; structure stays English (#6).** The confirmation is built in
code (it contains the numbers — invariant #2), with prose templated per detected language bucket;
`meal`/`source` literals stay English in the DB.

## Risks / Trade-offs

- **Name-match quality (fact vs estimate).** A naive exact/`ILIKE` match will miss synonyms
  ("куриное филе" vs "курица грудка"), pushing more entries to estimate. Acceptable for this slice —
  estimate is the honest fallback and the eval asserts the *tagging*, not match recall; fuzzier
  matching (and the multi-match → ask flow) is `clarify`'s job.
- **Meal heuristic vs reality.** A late dinner at 23:30 logs as `snack`. Correctable later; reviews
  group by date, not meal, so the daily totals are unaffected.
- **Callback payload size.** 64-byte `callback_data` limit → long product names can't round-trip the
  full base; we omit the button rather than store a server-side draft (keeps food-text stateless).
- **Memory / cost / build-off-box.** No new long-lived state; fact path = 0 LLM calls, estimate path =
  1 cached-prefix call (no agent loop) — within the 512 MB bot cap and the cost envelope. No new deps,
  no migration; image still builds in CI → GHCR, nothing runs on the host.
