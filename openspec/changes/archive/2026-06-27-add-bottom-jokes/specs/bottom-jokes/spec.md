# Bottom Jokes Specification

## Purpose

The bottom-jokes capability shows deterministic Ukrainian weather-themed footer
copy and required data attribution links.

## ADDED Requirements

### Requirement: Deterministic footer jokes

The system SHALL show a calm Ukrainian weather-themed joke in the footer without
external APIs or tracking (`FR-JOKES-01`, `BC-BRAND-01`, `BC-PRIVACY-01`).

#### Scenario: Joke renders in the footer

- **GIVEN** the visitor views the home page
- **WHEN** the footer renders
- **THEN** a Ukrainian weather-themed joke is visible
- **AND** the joke text contains no exclamation marks

#### Scenario: Joke is stable for the same location and day

- **GIVEN** the active location and calendar date stay the same
- **WHEN** the footer re-renders
- **THEN** the same joke is selected

#### Scenario: Joke can change when location changes

- **GIVEN** the visitor selects a different active location
- **WHEN** the footer updates
- **THEN** the joke selection may change based on the new seed

### Requirement: Footer attribution links

The system SHALL credit Open-Meteo and OpenStreetMap with hyperlinks in the footer
(`BC-BRAND-02`).

#### Scenario: Credits are visible

- **GIVEN** the footer renders
- **WHEN** the visitor reads the attribution line
- **THEN** links to Open-Meteo and OpenStreetMap are present
