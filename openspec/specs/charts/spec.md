# charts capability

## Purpose
The charts capability renders the visual history of a single plant on its detail view: a watering chart (the headline feature) and a growth chart, both built with Recharts. It plots individual events as points on a daily timeline, shows a clear empty state when there is no data, and stays in sync as events and measurements are added, edited, or deleted. Charts are a complementary view only — the same values are always readable as a list/table — so charts are never the sole way to access the data. Any interactive chart controls (e.g. legend toggles, tooltips, or focusable data points) are keyboard-operable and have accessible labels (SC-6, NFR-A11Y-04). Out of scope for MVP (Future): bucketed/aggregated granularity and selectable date ranges (FR-CHART-05) and derived insights such as average watering interval or growth rate (FR-CHART-06). Authorization, ownership, and access-control checks are intentionally out of scope for this capability because the app is a single local user with no authentication (NFR-SEC-01, TC-04, BC-02); there is no unauthorized actor to guard against, so no unauthorized/forbidden error path applies here.

## Requirements

### Requirement: Watering chart
The system SHALL display a watering chart on the plant detail view that plots that plant's watering events over time, each event as an individual point on a daily timeline with no bucketing (FR-CHART-01).

#### Scenario: Plant has watering events
- **WHEN** the Owner opens the detail view of a plant that has one or more watering events
- **THEN** the watering chart renders one point per watering event positioned on a daily timeline ordered by date, with no aggregation/bucketing of events

#### Scenario: Single watering event renders
- **WHEN** the plant has exactly one watering event
- **THEN** the watering chart renders that single point on the timeline without error and without an empty state

#### Scenario: Chart render failure is contained
- **WHEN** the watering chart throws while rendering (a chart-island render error)
- **THEN** a chart-level error boundary shows an inline non-blocking Ukrainian fallback ("chart unavailable — see the list below") in the chart area instead of a raw 500 page or a silently blank panel, and the waterings list on the same page stays readable (NFR-A11Y-03)

### Requirement: Growth chart
The system SHALL display a growth chart on the plant detail view that plots that plant's height measurements (in centimetres) over time, each measurement as an individual point on a daily timeline with no bucketing (FR-CHART-02).

#### Scenario: Plant has measurements
- **WHEN** the Owner opens the detail view of a plant that has one or more height measurements
- **THEN** the growth chart renders one point per measurement positioned on a daily timeline ordered by date, with the height value (cm) as the plotted value

#### Scenario: Decimal and locale-formatted heights plot correctly
- **WHEN** measurements include decimal heights, including values entered with a decimal comma or trailing zeros as accepted by FR-GROWTH-05 (e.g. 12,50 cm stored as 12.5)
- **THEN** the growth chart plots the numeric value correctly (12.5) and does not drop, round away, or misplot the point

#### Scenario: Largest permitted height value scales the axis without breaking
- **WHEN** a plant has a measurement at the maximum height value FR-GROWTH-05 permits (the upstream-validated upper bound for a stored height)
- **THEN** the growth chart's value axis scales to include that value and renders the point in-bounds, without overflow, label clipping that hides the value, axis-tick collapse, or a render error — value validation itself is owned by FR-GROWTH-05 and is not re-enforced here

#### Scenario: Chart render failure is contained
- **WHEN** the growth chart throws while rendering (a chart-island render error)
- **THEN** a chart-level error boundary shows an inline non-blocking Ukrainian fallback ("chart unavailable — see the list below") in the chart area instead of a raw 500 page or a silently blank panel, and the measurements list on the same page stays readable (NFR-A11Y-03)

### Requirement: Empty state
The system SHALL show a clear empty state in each chart when the plant has no corresponding data yet, distinct from a loading or error state (FR-CHART-03).

#### Scenario: No watering events
- **WHEN** the Owner opens the detail view of a plant that has zero watering events
- **THEN** the watering chart area shows an explicit empty-state message (e.g. "No watering events yet") rather than an empty/blank plot, a zeroed axis, or an error

#### Scenario: No measurements
- **WHEN** the Owner opens the detail view of a plant that has zero height measurements
- **THEN** the growth chart area shows an explicit empty-state message (e.g. "No measurements yet") rather than an empty/blank plot, a zeroed axis, or an error

#### Scenario: Empty state is not an error
- **WHEN** a chart is in its empty state
- **THEN** the empty state is visually and semantically distinct from the chart render-failure fallback and from a loading indicator (the empty state is a neutral `status` region; the render-failure fallback is an `alert` region)

### Requirement: Charts reflect mutations
The system SHALL update each chart to reflect newly added, edited, or deleted events/measurements so the rendered points stay consistent with the current data (FR-CHART-04).

#### Scenario: Add reflects in chart
- **WHEN** the Owner adds a watering event or a height measurement for the plant
- **THEN** the corresponding chart shows the new point within the same plant detail view, without a full page navigation or reload

#### Scenario: Edit reflects in chart
- **WHEN** the Owner edits the date or value of an existing event/measurement
- **THEN** the corresponding chart point moves to its new position/value

#### Scenario: Delete reflects in chart
- **WHEN** the Owner deletes an event/measurement
- **THEN** the corresponding chart point is removed; if it was the last data point, the chart transitions to its empty state (FR-CHART-03)

### Requirement: Charts are never the only way to read data
The system SHALL ensure the values shown in each chart are also available as a list/table on the same plant detail view, so charts are never the sole means of reading the data (NFR-A11Y-03).

#### Scenario: Watering values readable without the chart
- **WHEN** the Owner views a plant with watering events
- **THEN** the same watering values are accessible as the watering list/table (FR-WATER-03), independent of the chart rendering

#### Scenario: Growth values readable without the chart
- **WHEN** the Owner views a plant with height measurements
- **THEN** the same measurement values are accessible as the measurements list/table (FR-GROWTH-02), independent of the chart rendering

#### Scenario: Chart fails but data remains readable
- **WHEN** a chart fails to render and its error boundary shows the inline render-failure fallback
- **THEN** the underlying list/table still presents the values, so no data is made unreadable by a chart failure

### Requirement: Chart render performance
The system SHALL render each chart within 500 ms for a single plant with up to 365 data points (NFR-PERF-02), and SHALL still render all data points for datasets that exceed that supported maximum rather than failing or truncating.

#### Scenario: Within performance budget at upper bound
- **WHEN** a chart is rendered for a single plant holding up to 365 data points
- **THEN** the chart completes its initial render within 500 ms (locally verifiable)

#### Scenario: Dataset exceeds the supported maximum
- **WHEN** a chart is rendered for a single plant holding more than 365 data points (e.g. 400+ events)
- **THEN** the chart still renders every data point with correct values — degrading gracefully on render time only (the 500 ms budget is no longer guaranteed above 365 points) — and SHALL NOT cap, drop, bucket, or truncate points, throw a render error, or fall back to the empty/error state
