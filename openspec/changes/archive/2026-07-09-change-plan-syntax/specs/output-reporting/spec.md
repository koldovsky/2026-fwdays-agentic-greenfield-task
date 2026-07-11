## MODIFIED Requirements

### Requirement: Stderr rendering of every warning kind
The system SHALL render every parse-level warning (malformed line,
duplicate name) and every match-level warning (unknown name, non-UAH-only
match, ambiguous match) as a line on stderr. No warning kind SHALL be
silently dropped, and no warning SHALL be rendered on stdout.

#### Scenario: A malformed-line warning is rendered
- **WHEN** a parse-level warning reports a missing `-` separator on line 4
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
