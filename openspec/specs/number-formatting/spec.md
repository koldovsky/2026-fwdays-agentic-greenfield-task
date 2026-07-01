# number-formatting

## Purpose

A single shared formatter for rendering numeric grams/units values into prose (invariant #2:
totals come from the SUM, never hand-summed — the LLM writes prose only, never the numbers).
`fmt(n: number): string` lives in `src/util/num.ts` and is the one home for the formatting rules
(integer vs. one-decimal fractional rendering) that every user-facing surface — food logging,
body metrics, and nutrition query — imports rather than reimplementing.

## Requirements

### Requirement: Numeric-prose formatting is single-sourced

The system SHALL expose one shared formatter, `fmt(n: number): string`, from `src/util/num.ts`.
Every user-facing surface that renders a numeric grams/units value into prose SHALL import this
formatter; no module SHALL define its own copy of the function.

#### Scenario: Integer renders without a decimal

- **WHEN** `fmt` receives an integer value (e.g. `200`)
- **THEN** it returns the plain integer string (`"200"`), with no trailing `.0`

#### Scenario: Fractional value renders with one decimal

- **WHEN** `fmt` receives a non-integer value (e.g. `89.25`)
- **THEN** it returns the value fixed to one decimal place (`"89.3"`)

#### Scenario: Whole-valued float renders as an integer

- **WHEN** `fmt` receives a float that is a whole number (e.g. `90.0`)
- **THEN** `Number.isInteger` holds and it returns the plain integer string (`"90"`)

### Requirement: Extraction preserves observable behavior

The formatter's behavior after extraction SHALL be byte-for-byte identical to the three copies it
replaces. The food-logging, body-metrics, and nutrition-query surfaces SHALL produce the same
rendered numbers as before, and their existing test suites SHALL stay green with no change.

#### Scenario: Existing surface behavior unchanged

- **WHEN** the food, metrics, and query confirmation/answer paths render a number after the
  extraction
- **THEN** the produced string for any given input matches the pre-extraction result, and the
  food/metrics/query suites pass without modification
