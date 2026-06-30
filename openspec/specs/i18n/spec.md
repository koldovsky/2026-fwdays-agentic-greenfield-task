# Internationalisation (Ukrainian copy)

## Purpose
Centralise all user-facing strings so the Ukrainian-first copy — calm, no
exclamation marks — is authored and reviewed in one place, with no runtime i18n
library.

## Requirements

### Requirement: Centralised UI strings (FR-I18N-01, NFR-I18N-01)
All user-facing strings SHALL live in `lib/i18n/uk.ts` and be consumed through a
typed accessor; components SHALL NOT contain inline string literals. No runtime
i18n library is used.

#### Scenario: A component renders copy from the string table
- **WHEN** a component needs user-facing text
- **THEN** it reads the string from `lib/i18n/uk.ts` rather than embedding a literal

#### Scenario: Copy follows the brand voice
- **WHEN** a string is added to the table
- **THEN** it is Ukrainian, calm, and contains no exclamation marks
