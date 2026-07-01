## 1. Package scaffolding

- [x] 1.1 Create the jar-matching package under the `md/agentic/monojar` module (e.g. `internal/jarmatching`)
- [x] 1.2 Define `Matched{Name string, Amount int, SendID string}` and `Warning{Name string, Reason string}`
- [x] 1.3 Define the four skip-reason values/constants used in `Warning.Reason`: unknown, non-UAH-only, ambiguous (duplicate is not this package's concern — handled upstream by `plan-parsing`)

## 2. Core matching logic

- [x] 2.1 Implement `MatchJars(plan planparsing.Plan, jars []monoclient.Jar) ([]Matched, []Warning)`
- [x] 2.2 For each plan entry, find all jars (any currency) whose `Title` case-fold-equals (`strings.EqualFold`) the trimmed plan name
- [x] 2.3 Zero title matches → append an unknown-name `Warning` listing deduplicated titles of UAH-eligible (`CurrencyCode == 980`) jars
- [x] 2.4 ≥1 title match but zero of them UAH → append a non-UAH-only `Warning`, distinct from the unknown-name warning
- [x] 2.5 Exactly one UAH title match → append `Matched{Name, Amount, SendID}`
- [x] 2.6 More than one UAH title match → append an ambiguous `Warning`
- [x] 2.7 Preserve plan order in both the `Matched` and `Warning` output slices, independent of the order jars appear in `jars`

## 3. Tests

- [x] 3.1 Table-driven tests for exact case-insensitive matching, including Unicode titles (e.g. `Заощадження` vs `заощадження`) and rejecting substring matches
- [x] 3.2 Test the currency filter: a plan name matching only a non-UAH jar is skipped with a currency warning, not an unknown-name warning
- [x] 3.3 Test unknown-name detection: zero matches of any currency produces a warning listing deduplicated UAH-eligible jar titles
- [x] 3.4 Test ambiguous detection: two UAH jars sharing a title both match, producing one ambiguous warning and no `Matched` entry
- [x] 3.5 Test that matched results and warnings preserve plan order even when the fetched jar list is in a different order
- [x] 3.6 Test the full mixed scenario: a plan with one clean match, one unknown, one non-UAH-only, and one ambiguous entry, asserting the exact `Matched`/`Warning` sets produced
