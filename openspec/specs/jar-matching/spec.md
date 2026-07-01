# jar-matching

## Purpose

Matches parsed plan entries (`plan-parsing`'s `Plan.Entries`) against
fetched monobank jars (`mono-client`'s `[]Jar`): exact case-insensitive
title matching, UAH-currency eligibility filtering, and unknown/ambiguous
name detection (FR-RESOLVE-02/03/04, FR-CURRENCY-01). This capability is
pure — no network, no file I/O — and enforces the product's core safety
property (BC-SAFE-01): a plan entry is only ever resolved to a jar when the
match is exact and unambiguous, never guessed. Downstream capabilities
(`link-generation`, `cli-orchestration`) consume its matched
`(name, amount, sendId)` results and skip warnings.

## Requirements

### Requirement: Case-insensitive exact title matching
A plan name SHALL match a jar when, after trimming, it equals the jar
`Title` case-insensitively (Unicode-aware) as a full string. Substring or
fuzzy matching SHALL NOT be used.

#### Scenario: Exact case-insensitive match resolves
- **WHEN** the plan name is `заощадження` and a jar's `Title` is
  `Заощадження`
- **THEN** the plan entry matches that jar

#### Scenario: Substring is not a match
- **WHEN** the plan name is `Заощ` and a jar's `Title` is `Заощадження`
- **THEN** the plan entry does not match that jar

### Requirement: UAH-currency eligibility filter
Only jars with `CurrencyCode == 980` (UAH) SHALL be eligible for matching.
A plan name whose only title match(es) are non-UAH jar(s) SHALL be skipped
with a warning distinct from the unknown-name warning.

#### Scenario: UAH jar is eligible
- **WHEN** the plan name matches a jar with `CurrencyCode == 980`
- **THEN** that jar is eligible to be matched

#### Scenario: Non-UAH-only match is skipped with a currency warning
- **WHEN** the plan name matches only a jar with `CurrencyCode != 980`
- **THEN** the entry is skipped with a warning distinguishing it from an
  unknown-name warning, and no link is emitted for it

### Requirement: Unknown jar name detection
A plan name with zero jars (of any currency) matching its title SHALL be
skipped with a warning that lists the available (UAH-eligible) jar names.

#### Scenario: No matching jar of any currency is unknown
- **WHEN** the plan name matches no jar's `Title`, regardless of currency
- **THEN** the entry is skipped with a warning listing the titles of the
  account's UAH-eligible jars, and no link is emitted for it

#### Scenario: Available-names list is deduplicated
- **WHEN** two UAH-eligible jars share the same `Title`
- **THEN** that title appears only once in the available-names list of an
  unknown-name warning

### Requirement: Ambiguous jar name detection
A plan name matching more than one eligible (UAH) jar SHALL be skipped with
a warning; no link SHALL be emitted for it.

#### Scenario: Two UAH jars sharing a title are ambiguous
- **WHEN** the plan name case-insensitively matches the `Title` of two
  distinct UAH jars
- **THEN** the entry is skipped with an ambiguous-match warning, and no
  link is emitted for it

### Requirement: Deterministic match order
Matched results SHALL be returned in the order their plan entries appear in
the input `Plan`, regardless of the order jars appear in the fetched jar
list.

#### Scenario: Matched results preserve plan order
- **WHEN** the plan lists `Подорожі` before `Заощадження`, and the fetched
  jar list has `Заощадження` before `Подорожі`
- **THEN** the matched results list `Подорожі` before `Заощадження`

### Requirement: Personal UAH jars only, never a guessed match
Matching SHALL consider only the `jars[]` data already exposed by
`mono-client` (personal jars, never `accounts[]`/business jars). Any plan
entry that is not an unambiguous single-UAH-jar match SHALL be skipped and
reported as a warning rather than matched to any jar.

#### Scenario: Every non-unambiguous outcome produces a warning, not a guess
- **WHEN** a plan entry's resolution outcome is unknown, non-UAH-only, or
  ambiguous
- **THEN** the entry produces exactly one warning and contributes no entry
  to the matched results
