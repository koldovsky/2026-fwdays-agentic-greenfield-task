# Converter (UAH ⇄ currency) — implementation delta

Implements the baseline capability. Requirements below match
`openspec/specs/converter/spec.md`; no behavioural change from baseline.

## ADDED Requirements

### Requirement: Convert both directions (FR-CONVERT-01, FR-CONVERT-03)
The system SHALL convert between UAH and the active currency at the official rate
in both directions, with a swap control that flips the direction.

#### Scenario: Convert foreign to UAH
- **WHEN** the user enters an amount in the foreign-currency field
- **THEN** the UAH equivalent at the official rate is shown

#### Scenario: Swap direction
- **WHEN** the user activates the swap control
- **THEN** the conversion direction flips between UAH → foreign and foreign → UAH

### Requirement: Locale-aware amount input (FR-CONVERT-02, NFR-LOCALE-01)
The amount input SHALL accept comma decimals («100,50») and trailing zeros and
SHALL ignore stray spaces.

#### Scenario: Comma decimal is accepted
- **WHEN** the user enters «100,50»
- **THEN** it is parsed as 100.50 and converted correctly

### Requirement: Locale-aware result formatting (FR-CONVERT-04, NFR-LOCALE-01)
Results SHALL be formatted in uk-UA (comma decimal, thin-space thousands, ₴ after
the number) in mono tabular figures.

#### Scenario: Result is formatted for uk-UA
- **WHEN** a conversion produces 1308.4
- **THEN** it is shown as «1 308,40 ₴» in tabular mono

### Requirement: Total, safe arithmetic (FR-CONVERT-05, NFR-OBS-01)
Invalid or empty input SHALL resolve to 0 (or a calm hint) — never `NaN`, never a
crash.

#### Scenario: Empty input
- **WHEN** the amount field is empty or non-numeric
- **THEN** the result is 0 (or a calm hint) and no error is thrown
