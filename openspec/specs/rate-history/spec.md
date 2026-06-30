# Rate history chart

## Purpose
Show a calm ~30-day line of the active currency's official UAH rate so the recent
trend is visible at a glance, with honest loading/empty/error states and an honest
y-domain.

## Requirements

### Requirement: Thirty-day history line (FR-HISTORY-01)
The system SHALL show a ~30-day line of the active currency's official UAH rate.

#### Scenario: History line for the active currency
- **WHEN** a currency is active and its history has loaded
- **THEN** a line chart of its official rate over the last ~30 days is shown

### Requirement: Fetch the history window (FR-HISTORY-02)
The system SHALL fetch the history window from NBU, using the range endpoint where
available and a date-iteration fallback otherwise.

#### Scenario: History window is requested
- **WHEN** a currency becomes active
- **THEN** its ~30-day rate window is requested from NBU server-side

### Requirement: Honest loading, empty and error states (FR-HISTORY-03, NFR-OBS-01)
Loading SHALL show a skeleton of equal footprint; no data SHALL show an honest
empty state; a fetch failure SHALL degrade visibly, never blank or 500.

#### Scenario: History fails to load
- **WHEN** the history request fails
- **THEN** a visible, calm error state is shown in place of the chart

#### Scenario: No history data
- **WHEN** the history window returns no points
- **THEN** an honest empty state is shown

### Requirement: Honest y-domain (FR-HISTORY-04)
The chart's y-domain SHALL be padded around the data so small moves read honestly,
not dramatised.

#### Scenario: Small move is not exaggerated
- **WHEN** the rate barely changes across the window
- **THEN** the line reads as roughly flat rather than as a dramatic swing
