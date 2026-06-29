# slug

## ADDED Requirements

### Requirement: Title to slug
The system SHALL lowercase, transliterate Ukrainian Cyrillic to Latin, replace runs of
non-alphanumerics with a single dash, and trim leading/trailing dashes.

#### Scenario: ASCII title
- **WHEN** slugifying "Atomic Habits"
- **THEN** the result is `atomic-habits`

#### Scenario: Ukrainian title
- **WHEN** slugifying "Глибока робота"
- **THEN** the result is a Latin slug (e.g. `hlyboka-robota`)

#### Scenario: Apostrophes and separators
- **WHEN** slugifying "П'ять" or "  Hello---World!  "
- **THEN** apostrophes are dropped and separators collapse to single dashes (e.g. `piat`, `hello-world`)

### Requirement: Non-empty fallback
The system SHALL return `book` when the input has no usable characters.

#### Scenario: Symbols-only input
- **WHEN** slugifying "!!!" or ""
- **THEN** the result is `book`
