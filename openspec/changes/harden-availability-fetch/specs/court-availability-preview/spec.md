# Delta: court-availability-preview

## ADDED Requirements

### Requirement: Friendly availability errors with retry (FR-AVAIL-04)

When MHOA availability cannot be loaded, the system SHALL show a short resident-friendly message (not raw Playwright output) and offer a **Try again** action.

#### Scenario: Timeout on live scrape

- **WHEN** live scrape exceeds the server budget or MHOA calendar does not respond
- **THEN** UI shows a friendly timeout message and a retry control

#### Scenario: Retry bypasses stale cache

- **WHEN** user clicks **Try again** after a failed load
- **THEN** the client refetches availability for that date without reusing a cached error

#### Scenario: Prefetch does not block active date

- **WHEN** user opens the booking wizard
- **THEN** at most one date is prefetched in the background (tomorrow), not all seven bookable days
