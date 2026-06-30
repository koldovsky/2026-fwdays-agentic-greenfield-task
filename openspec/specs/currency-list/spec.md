# Currency list (today's rates)

## Purpose
Fetch and present today's official NBU rates for the supported currencies, with
honest provenance (effective date, stale labelling) and honest failure handling.

## Requirements

### Requirement: Fetch today's official rates (FR-RATES-01)
On load, the system SHALL fetch today's official rates from the NBU exchange
endpoint, server-side.

#### Scenario: Rates load on first view
- **WHEN** the application is opened
- **THEN** today's official NBU rates are requested from the server
- **AND** the returned rates are shown once available

### Requirement: Render currency rows (FR-RATES-02)
The system SHALL render a list of supported currencies; each row SHALL show the
country flag, ISO code, Ukrainian name, the official rate in uk-UA mono tabular
format, and the unit.

#### Scenario: A currency row shows its rate
- **WHEN** the rates have loaded
- **THEN** each row shows the ISO code, Ukrainian name, and the official rate as a tabular mono number

### Requirement: Honest effective date and stale labelling (FR-RATES-03, BC-HONESTY-01)
The system SHALL show the effective NBU date; when the figure is a previous
business day's (weekend or holiday), it SHALL be labelled as that date, never
relabelled as "today".

#### Scenario: Weekend rate is labelled with its real date
- **WHEN** the latest official rate is from a previous business day
- **THEN** the interface shows «Курс за DD.MM.YYYY» rather than presenting it as today's

### Requirement: Select active currency (FR-RATES-04)
Selecting a currency row SHALL set the active currency for the focus/detail panel.

#### Scenario: Selecting a row focuses the currency
- **WHEN** the user selects a currency row
- **THEN** that currency becomes the active currency for the converter and history

### Requirement: Degrade on fetch failure (FR-RATES-05, NFR-OBS-01)
On fetch failure (network error, non-200, or timeout) the system SHALL show a
visible degraded state; it SHALL never produce a generic 500 or a blank screen.

#### Scenario: NBU is unreachable
- **WHEN** the rates request fails or times out
- **THEN** a visible, calm error state is shown
- **AND** the page does not crash or go blank
