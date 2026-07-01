## Context

`internal/planparsing` already exports `Plan{Entries []Entry}`, where each
`Entry` has `Name`, `Amount`, `Line`. `internal/monoclient` already exports
`Jar{Title, SendID, CurrencyCode}` via `JarFetcher.FetchJars`. Both are
shipped and tested in isolation. `jar-matching` is the first capability to
consume both together — it has no I/O of its own, only a pure function over
the two already-validated inputs.

The four requirements it owns interact in a specific order: a plan name can
fail resolution for two structurally different reasons — "no jar has this
title at all" (unknown, FR-RESOLVE-03) vs. "a jar has this title but it's
not a UAH jar" (currency-ineligible, FR-CURRENCY-01) — and these must not be
conflated into one generic "not found" message, since the fix a user needs
(typo vs. wrong-currency jar) differs.

## Goals / Non-Goals

**Goals:**
- Pure function: `(planparsing.Plan, []monoclient.Jar) → (matched, warnings)`,
  no network, no file I/O, no globals — fully unit-testable without either
  upstream capability's fixtures.
- Distinguish, as separate warning reasons: unknown name, ambiguous name,
  non-UAH-only match. (Duplicate-name skipping is already handled upstream
  by `plan-parsing`'s `dropDuplicates`; `jar-matching` never sees duplicate
  plan names.)
- Deterministic: matched results preserve plan order; warnings are
  generated in a stable, plan-order-derived sequence. Jar order in the
  `client-info` response never affects the outcome.
- Output shape is exactly what `link-generation` needs next: `(name,
  amount, sendId)` — nothing more.

**Non-Goals:**
- No substring/fuzzy matching (FR-RESOLVE-02 is explicit: full-string,
  case-insensitive only).
- No link construction (`https://send.monobank.ua/...`) — that's
  `link-generation`.
- No stdout/stderr rendering of warnings — that's `output-reporting`. This
  capability only produces structured `Warning` values.
- No handling of duplicate plan names — already eliminated before this
  capability runs.

## Decisions

**1. Two-stage lookup: match-by-title first, then filter-by-currency.**
For each plan entry, first find *all* jars (any currency) whose `Title`
case-fold-equals the trimmed plan name. Then:
- 0 title matches → **unknown** (FR-RESOLVE-03).
- ≥1 title match, but 0 of them are UAH (`CurrencyCode == 980`) →
  **non-UAH** (FR-CURRENCY-01).
- ≥1 UAH match, and exactly 1 → **matched**.
- ≥1 UAH match, and >1 → **ambiguous** (FR-RESOLVE-04).

Alternative considered: filter to UAH jars first, then match titles only
within that filtered set. Rejected because it collapses "unknown" and
"non-UAH-only" into the same outcome (a non-UAH-titled jar would look
identical to no jar at all), losing the distinction the PRD asks for.

**2. Case-insensitive comparison via `strings.EqualFold`.**
`strings.EqualFold` performs Unicode simple case-folding, matching
FR-RESOLVE-02's "case-insensitively (Unicode-aware)" wording directly, and
avoids allocating a lowercased copy of every title per comparison.
Alternative considered: `strings.ToLower(a) == strings.ToLower(b)` — works,
but allocates on every comparison and Go's docs call out `EqualFold` as the
correct tool for exactly this case.

**3. "Available jar names" list is scoped to eligible (UAH) jars, deduped.**
For the unknown-name warning (FR-RESOLVE-03), the helpful list of "available
jar names" is built from the titles of UAH-eligible jars only, deduplicated.
Rationale: those are the only titles a corrected plan line could actually
resolve to; listing a non-UAH jar's title would point the user at a name
that will always hit the non-UAH warning instead. Deduplication keeps the
hint readable even if two UAH jars happen to share a title (itself only
surfaced as ambiguous if the user actually types that shared name).

**4. Input type is `planparsing.Plan`, not `[]planparsing.Entry`.**
`MatchJars(plan planparsing.Plan, jars []monoclient.Jar) ([]Matched,
[]Warning)` takes the exported `Plan` wrapper rather than unwrapping it at
the call site, so the call site (`cli-orchestration`, later) reads as
"parse, then match" without an intermediate unwrap. Non-goal creep risk
(adding fields to `Plan` later) is low since `plan-parsing` already treats
`Plan` as the stable public shape.

**5. Warning shape mirrors `planparsing.Warning`'s spirit but is
capability-local.** `jar-matching` defines its own `Warning{Name, Reason}`
rather than importing `planparsing.Warning`, since it has no line-number
concept (matching happens after parsing, on trimmed names only) and needs a
distinct set of reasons. Keeping it local avoids coupling `jar-matching`'s
output shape to `plan-parsing`'s internal representation.

## Risks / Trade-offs

- **Risk:** `client-info` could return two UAH jars with the same title
  (user-created duplicate on the monobank side, outside this tool's
  control). → **Mitigation:** already covered by the ambiguous-match branch
  (decision 1); no special-casing needed, it falls out of the general rule.
- **Risk:** Silently treating a currency-fold edge case (e.g. Turkish
  dotless-I) inconsistently between plan input and jar titles. →
  **Mitigation:** `strings.EqualFold` is the same function on both sides of
  every comparison, so behavior is at least internally consistent; exotic
  locale edge cases are accepted as out of scope, matching the tool's
  personal/single-user framing.
- **Trade-off:** Building the "available names" hint list is O(jars) per
  unknown plan entry when done naively. At the scale this tool targets
  (single user, a handful of personal jars), this is not worth optimizing
  with a pre-built index.

## Open Questions

None — all four owned requirements (FR-RESOLVE-02/03/04, FR-CURRENCY-01)
have unambiguous PRD text and are resolved by decision 1 above.
