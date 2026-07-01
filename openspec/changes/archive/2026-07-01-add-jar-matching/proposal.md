## Why

`plan-parsing` produces validated `(name, amount)` entries and `mono-client`
fetches the account's `Jar` list, but nothing yet connects them. `jarsplit`
needs a pure matching step that turns those two independent inputs into the
`(sendId, amount)` pairs that `link-generation` will consume — while
enforcing the product's core safety property (BC-SAFE-01): a plan name is
only ever resolved to a link when the match is exact and unambiguous, never
guessed.

## What Changes

- Add a new `jar-matching` capability (`internal/jarmatching`) that takes a
  `planparsing.Plan` and a `[]monoclient.Jar` and returns matched
  `(name, amount, sendId)` results plus a list of skip warnings.
- Case-insensitive (Unicode-aware), full-string matching of a trimmed plan
  name against jar `Title` — no substring or fuzzy matching (FR-RESOLVE-02).
- Currency filter: only jars with `CurrencyCode == 980` (UAH) are eligible
  for matching; a plan name matching solely non-UAH jar(s) is skipped with a
  warning (FR-CURRENCY-01).
- Unknown-name handling: a plan name with zero matching eligible jars is
  skipped with a warning listing the available jar names (FR-RESOLVE-03).
- Ambiguous-name handling: a plan name matching more than one eligible jar
  is skipped with a warning, no link emitted (FR-RESOLVE-04).
- Deterministic output order: matched results are returned in plan order,
  independent of jar order in the `client-info` response.

## Capabilities

### New Capabilities
- `jar-matching`: matches parsed plan entries against fetched monobank jars
  — exact case-insensitive title matching, UAH-currency eligibility
  filtering, and unknown/ambiguous-name detection — producing matched
  `(name, amount, sendId)` results and skip warnings, never a guessed match.

### Modified Capabilities
(none — `plan-parsing` and `mono-client` are consumed as-is via their
existing exported `Plan`/`Entry` and `Jar` types; no changes to their
requirements.)

## Impact

- New package `internal/jarmatching`, depending on `internal/planparsing`
  and `internal/monoclient` (both already shipped).
- No changes to existing packages, the `client-info` fixture format, or the
  `jarsplit` binary (not yet wired — that's `cli-orchestration`, Phase 5).
- Unblocks Phase 3 (`link-generation`), which will consume this
  capability's matched results.
