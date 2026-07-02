# output-reporting Specification

## Purpose
TBD - created by archiving change add-output-reporting. Update Purpose after archive.
## Requirements
### Requirement: Stdout table of emitted links
The system SHALL render every emitted link as a row of a table on stdout,
containing at least the jar name, the amount, and the link, in the same
order the links are given.

#### Scenario: Table rows follow link order
- **WHEN** links are given in the order `Заощадження`, `Подорожі`,
  `Подушка`
- **THEN** the stdout table lists those three rows in that same order,
  each showing its jar name, amount, and link

#### Scenario: No links produces no jar rows
- **WHEN** zero links are given
- **THEN** the stdout table contains no jar rows

### Requirement: Amounts are displayed with the currency symbol
Every amount rendered on stdout SHALL be shown with the `₴` symbol.

#### Scenario: A row's amount carries the currency symbol
- **WHEN** a link has `Amount = 5000`
- **THEN** its table row displays the amount as `5000 ₴`

### Requirement: Total line for emitted links
The system SHALL render a `Разом` (total) line on stdout summing the
amounts of exactly the links given — no more, no less.

#### Scenario: Total sums only emitted links
- **WHEN** links with amounts `5000`, `3000`, `1500` are given
- **THEN** the `Разом` line shows `9500 ₴`

#### Scenario: Total is present even with zero links
- **WHEN** zero links are given
- **THEN** the `Разом` line shows `0 ₴`

### Requirement: Stderr rendering of every warning kind
The system SHALL render every parse-level warning (malformed line,
duplicate name) and every match-level warning (unknown name, non-UAH-only
match, ambiguous match) as a line on stderr. No warning kind SHALL be
silently dropped, and no warning SHALL be rendered on stdout.

#### Scenario: A malformed-line warning is rendered
- **WHEN** a parse-level warning reports a missing `=` separator on line 4
- **THEN** stderr contains a line referencing line 4 and the warning's
  reason

#### Scenario: A duplicate-name warning is rendered
- **WHEN** a parse-level warning reports jar name `Заощадження` duplicated
  on lines 2 and 5
- **THEN** stderr contains a line referencing both line numbers, the jar
  name, and the duplicate reason

#### Scenario: An unknown-name warning is rendered
- **WHEN** a match-level warning reports jar name `Типо` as unknown
- **THEN** stderr contains a line naming `Типо` and its unknown-name
  reason

#### Scenario: A non-UAH-only warning is rendered
- **WHEN** a match-level warning reports jar name `Подорожі` matching only
  a non-UAH jar
- **THEN** stderr contains a line naming `Подорожі` and its non-UAH
  reason

#### Scenario: An ambiguous-match warning is rendered
- **WHEN** a match-level warning reports jar name `Подушка` as ambiguous
- **THEN** stderr contains a line naming `Подушка` and its ambiguous
  reason

#### Scenario: Warnings never appear on stdout
- **WHEN** any parse-level or match-level warnings are given
- **THEN** none of their text appears in the stdout table output

### Requirement: Skip reconciliation total
When one or more match-level warnings are given, the system SHALL render
on stderr the planned total (the sum of emitted link amounts and
match-level-skipped amounts), the skipped total (the sum of
match-level-skipped amounts only), and the skipped count (the number of
match-level warnings). Parse-level warnings (malformed lines, duplicates)
SHALL NOT contribute an amount to either total, matching the rule that a
malformed or duplicate amount is never summed.

#### Scenario: Reconciliation totals reflect matched and skipped amounts
- **WHEN** links totaling `8000` are emitted and one match-level warning
  for an entry with amount `1500` is given
- **THEN** stderr shows a planned total of `9500 ₴`, a skipped total of
  `1500 ₴`, and a skipped count of `1`

#### Scenario: No reconciliation line when nothing was skipped at match level
- **WHEN** zero match-level warnings are given, regardless of any
  parse-level warnings
- **THEN** stderr contains no reconciliation line

### Requirement: Deterministic rendering order
Rendering SHALL NOT reorder its inputs: the stdout table follows the
given link order, and stderr warnings are rendered with parse-level
warnings before match-level warnings, each group preserving its given
order. The same inputs SHALL always render byte-identical output.

#### Scenario: Parse-level warnings precede match-level warnings
- **WHEN** one parse-level warning and one match-level warning are given
- **THEN** the parse-level warning's line appears before the match-level
  warning's line on stderr

#### Scenario: Repeated rendering is byte-identical
- **WHEN** the same links and warnings are rendered twice
- **THEN** both renderings produce byte-identical output on stdout and on
  stderr

