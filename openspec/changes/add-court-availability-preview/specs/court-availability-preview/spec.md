# Delta: court-availability-preview

## ADDED Requirements

### Requirement: Tennis availability preview (FR-AVAIL-01)

Before final MHOA submission, the system SHALL fetch and display all available tennis slots for **East Court** and **West Court** on the parsed booking date.

#### Scenario: Both courts shown on confirm step

- **WHEN** user reaches confirm step for a valid tennis request
- **THEN** UI lists available slots for East Court and West Court for that date

#### Scenario: Live MHOA fetch

- **WHEN** `COLIBRI_SUBMIT_MODE=live`
- **THEN** availability is scraped from mahoganyhoa.com tennis form

#### Scenario: Stub mode

- **WHEN** stub mode is active
- **THEN** sample slot lists are shown without contacting MHOA

#### Scenario: Slot selection required

- **WHEN** availability is loaded
- **THEN** user must select a court and slot before **Submit to MHOA**

#### Scenario: Submit uses selection

- **WHEN** user submits with a selected slot
- **THEN** automation books that exact court and time on MHOA
