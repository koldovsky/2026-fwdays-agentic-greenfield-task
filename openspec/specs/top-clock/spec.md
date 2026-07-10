# Top Clock Specification

## Purpose

The top-clock capability shows a compact live local-time clock in the Weather
Explorer header.

## Requirements

### Requirement: Live local-time clock in header

The system SHALL show a compact accessible local-time clock in the top bar that
updates while the page is open (`FR-CLOCK-01`, `NFR-A11Y-01`, `NFR-OBS-01`).

#### Scenario: Clock renders in the header

- **GIVEN** the visitor opens the home page
- **WHEN** the shell header renders
- **THEN** a local-time clock appears between the wordmark and theme indicator
- **AND** the clock has an accessible name from i18n strings

#### Scenario: Clock updates every minute

- **GIVEN** the page stays open across a minute boundary
- **WHEN** the local minute changes
- **THEN** the displayed clock time updates without a full page reload
- **AND** no errors are logged to the console on a healthy session
