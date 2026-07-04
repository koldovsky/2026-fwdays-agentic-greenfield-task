# itinerary-sidebar

## Purpose

Chronological sidebar presenting total and per-day itinerary breakdown from client state. Implements FR-VIEW-01 and FR-VIEW-02 presentation semantics.

## ADDED Requirements

### Requirement: Itinerary overview

The application SHALL render a sidebar overview of the active itinerary showing total travel distance, number of travel days, and an estimated total duration computed deterministically on the client.

#### Scenario: Overview after successful planning

- **WHEN** route planning completes successfully
- **THEN** the sidebar displays total distance in kilometers
- **THEN** the sidebar displays the number of travel days
- **THEN** the sidebar displays an estimated total duration derived from client-side rules

#### Scenario: No sidebar without itinerary

- **WHEN** no successful itinerary is available
- **THEN** the itinerary sidebar is not shown

### Requirement: Per-day grouping

The sidebar SHALL group itinerary content by travel day and show each day's distance and stops in chronological order.

#### Scenario: Day sections match engine output

- **WHEN** the itinerary spans multiple travel days
- **THEN** the sidebar renders one section per travel day
- **THEN** each section lists the stops belonging to that day in order
- **THEN** each section shows that day's distance in kilometers

#### Scenario: Stop kind labels

- **WHEN** a day section lists stops
- **THEN** each stop displays a human-readable kind label in Ukrainian for start, end, rest, and overnight stops

### Requirement: Deterministic duration estimates

Duration values shown in the sidebar SHALL be computed by pure client functions from distance data without network access.

#### Scenario: Reproducible duration formatting

- **WHEN** the same itinerary distance values are formatted twice
- **THEN** the sidebar shows identical duration text both times

### Requirement: Sidebar accessibility

Itinerary breakdown data SHALL be available as structured text in the sidebar so users are not required to use the map to understand the plan.

#### Scenario: Textual itinerary access

- **WHEN** the sidebar is visible
- **THEN** total and per-day metrics are readable as text content
- **THEN** stop lists use semantic heading and list structure
