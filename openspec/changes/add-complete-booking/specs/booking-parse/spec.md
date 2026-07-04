# booking-parse

Parse natural-language booking requests into structured intent.

## Requirements

### Requirement: Extract date from free text (FR-NLP-01)

The system SHALL extract a target calendar date from weekday names, relative phrases (`next week`, `tomorrow`), and explicit dates.

#### Scenario: Monday next week

- **WHEN** the user request is "Monday next week from 11 AM to 12 AM for 1 slot" and reference date is 2026-07-03 (Friday)
- **THEN** parsed date is the Monday of the following calendar week (2026-07-06)

### Requirement: Extract time window (FR-NLP-02)

The system SHALL extract start and end times from AM/PM expressions.

#### Scenario: Morning window with noon typo

- **WHEN** the user writes "11 AM to 12 AM" with a morning start
- **THEN** window end is interpreted as 12:00 PM (noon)

### Requirement: Tennis slot duration (FR-NLP-03)

The system SHALL set slot duration to 45 minutes for tennis facilities.

#### Scenario: Tennis default duration

- **WHEN** facility is tennis and no duration is stated
- **THEN** slotDurationMinutes is 45

### Requirement: Court preference (FR-NLP-05, FR-INPUT-08)

The system SHALL extract East or West court when mentioned; otherwise court is unspecified.

#### Scenario: No court stated

- **WHEN** request does not mention East or West
- **THEN** courtOrSite is null

### Requirement: Structured output (FR-NLP-05)

The system SHALL return `{ facility, courtOrSite?, date, windowStart, windowEnd, slotDurationMinutes?, slotsRequested? }`.
