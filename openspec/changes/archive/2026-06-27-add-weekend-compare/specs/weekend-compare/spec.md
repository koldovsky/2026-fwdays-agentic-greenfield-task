# Weekend Compare — Implementation Delta

## ADDED Requirements

### Requirement: Pin up to three cities

The system SHALL let the visitor pin up to three cities and show them as chips
above the forecast panel (`FR-COMPARE-01`).

#### Scenario: Active city can be pinned

- **GIVEN** an active city location
- **WHEN** the visitor pins the city
- **THEN** a chip appears above the forecast panel
- **AND** no more than three pinned cities are kept

### Requirement: Weekend compare table

The system SHALL provide a compare-weekend toggle that shows a table with Saturday
and Sunday hi/lo, precipitation %, and comfort score per pinned city
(`FR-COMPARE-02`).

#### Scenario: Compare view replaces the day-card grid

- **GIVEN** at least one pinned city
- **WHEN** the visitor enables compare weekend
- **THEN** the forecast panel shows a compare table instead of the 7-day card grid
- **AND** each pinned city has Saturday and Sunday rows with hi/lo, precip %, and comfort

### Requirement: Sticky city headers with make active

The system SHALL render sticky column headers with the city name and a make-active
control (`FR-COMPARE-03`).

#### Scenario: Make active switches the active location

- **GIVEN** the compare table is visible
- **WHEN** the visitor chooses make active for a pinned city
- **THEN** that city becomes the active location
- **AND** the map and primary forecast follow the active city
