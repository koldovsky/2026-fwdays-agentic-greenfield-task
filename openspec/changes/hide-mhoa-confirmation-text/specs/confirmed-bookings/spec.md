# Delta: confirmed-bookings

## MODIFIED Requirements

### Requirement: Confirmed bookings list (FR-BOOK-01)

The system SHALL show structured booking details without raw MHOA page scrape text.

#### Scenario: No confirmation text blob

- **WHEN** user views `/bookings` or wizard submit success
- **THEN** the UI shows date, court, slot, and Confirmed badge only — not raw `confirmationText`
