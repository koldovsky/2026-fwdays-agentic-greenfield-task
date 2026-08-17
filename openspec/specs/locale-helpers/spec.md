## Purpose

Pure Ukrainian locale helpers for converting amounts and dates into forms required by Ukrainian commercial document templates (NFR-08, FR-21, BC-10, BC-13).

## Requirements

### Requirement: Amount to Ukrainian cursive
The system SHALL provide a pure function `amountToCursive(n)` that converts a numeric amount in гривні into a Ukrainian amount-in-words string with гривня and копійки, using only the Ukrainian locale and UAH (NFR-08, BC-10, BC-13).

#### Scenario: PRD example sum (TC-22)
- **WHEN** `amountToCursive(8750)` is called
- **THEN** the result MUST equal `Вісім тисяч сімсот п'ятдесят гривень 00 копійок`

#### Scenario: Integer amount has zero kopiyky
- **WHEN** `amountToCursive` is called with a whole-гривня number
- **THEN** the копійки portion MUST be exactly two digits `00` followed by the correct копійки declension

#### Scenario: Fractional amount maps to kopiyky
- **WHEN** `amountToCursive` is called with a value that has a fractional part (after rounding to two decimal places)
- **THEN** the integer part MUST be rendered as гривні in words and the fractional part as a two-digit копійки number with correct declension

### Requirement: Date to numeric Ukrainian form
The system SHALL provide a pure function `dateToNumeric(d)` that formats a date as `DD.MM.YYYY` (FR-21).

#### Scenario: PRD example numeric date (TC-23)
- **WHEN** `dateToNumeric` is called with the date corresponding to 15 May 2021 (e.g. string `15.05.2021` or equivalent `Date`)
- **THEN** the result MUST equal `15.05.2021`

### Requirement: Date to Ukrainian cursive
The system SHALL provide a pure function `dateToCursive(d)` that formats a date as day number, Ukrainian genitive month name, four-digit year, and the suffix ` р.` (FR-21, NFR-08, BC-10, BC-13).

#### Scenario: PRD example cursive date (TC-23)
- **WHEN** `dateToCursive` is called with the date corresponding to 15 May 2021 (e.g. string `15.05.2021` or equivalent `Date`)
- **THEN** the result MUST equal `15 травня 2021 р.`

#### Scenario: Month names are Ukrainian genitive
- **WHEN** `dateToCursive` is called for any calendar month
- **THEN** the month token MUST be the Ukrainian genitive form (січня, лютого, березня, квітня, травня, червня, липня, серпня, вересня, жовтня, листопада, грудня)

### Requirement: Helpers are pure and importable
The locale helpers SHALL be implemented as pure functions with no UI, filesystem, or network side effects, and MUST be importable by later capabilities (notably `template-fill`).

#### Scenario: No side effects
- **WHEN** any of `amountToCursive`, `dateToNumeric`, or `dateToCursive` is invoked
- **THEN** the call MUST return a string result without reading or writing files, mutating global app state, or rendering UI
