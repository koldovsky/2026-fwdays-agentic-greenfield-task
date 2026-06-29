## ADDED Requirements

### Requirement: Watering chart
The system SHALL display a watering chart on the plant detail view that plots that plant's watering events over time as a count-per-day line on a daily timeline ordered by date ascending, with no weekly/monthly bucketing (FR-CHART-01, FR-CHART-05 bucketing is Future). Because a watering event has no numeric value, the plotted y-value is the number of watering events on each calendar day; multiple events on the same day collapse to a single point whose count equals the number of that day's events — the exact per-event rows remain readable in the waterings list (NFR-A11Y-03). Date labels are displayed `DD.MM.YYYY` (SC-1). The chart region SHALL carry an accessible name and any interactive chart control SHALL be keyboard-operable (SC-6, NFR-A11Y-04).

#### Scenario: Plant has watering events on distinct days
- **WHEN** the Owner opens the detail view of a plant that has watering events on two or more distinct calendar days
- **THEN** the watering chart plots one count-per-day point for each day, ordered by date ascending (oldest to newest, left to right), with dates labelled `DD.MM.YYYY` (FR-CHART-01, SC-1)

#### Scenario: Multiple events on the same day collapse to one count point
- **WHEN** a plant has two or more watering events sharing the same calendar date
- **THEN** the watering chart shows a single point for that day with a count equal to the number of that day's events (not stacked individual markers), and the individual events remain readable in the waterings list (FR-CHART-01, NFR-A11Y-03)

#### Scenario: Single watering event renders
- **WHEN** the plant has exactly one watering event
- **THEN** the watering chart renders that single count-per-day point on the timeline without error and without showing the empty state (FR-CHART-01)

#### Scenario: No bucketing or zero-filling
- **WHEN** the watering chart is built from a plant's watering events
- **THEN** points are per calendar day with no aggregation into weekly/monthly buckets and no zero-valued points inserted for days without waterings (FR-CHART-01, FR-CHART-05 bucketing is Future)

### Requirement: Growth chart
The system SHALL display a growth chart on the plant detail view that plots that plant's height measurements (in centimetres) over time, one point per measurement, on a daily timeline ordered by date ascending, with no bucketing (FR-CHART-02). The plotted value is the stored numeric height; the chart SHALL preserve the exact stored value (decimals included) and SHALL NOT round, drop, or re-parse it — height validation is owned by FR-GROWTH-05 and is not re-enforced here. Date labels are displayed `DD.MM.YYYY` (SC-1). The chart region SHALL carry an accessible name (SC-6, NFR-A11Y-04).

#### Scenario: Plant has measurements
- **WHEN** the Owner opens the detail view of a plant that has one or more height measurements
- **THEN** the growth chart renders one point per measurement positioned on a daily timeline ordered by date ascending, with the height value (cm) as the plotted value and dates labelled `DD.MM.YYYY` (FR-CHART-02, SC-1)

#### Scenario: Single measurement renders
- **WHEN** the plant has exactly one height measurement
- **THEN** the growth chart renders that single point without error and without showing the empty state (FR-CHART-02)

#### Scenario: Decimal heights plot correctly
- **WHEN** measurements include a decimal height such as 12.5 cm (entered with a decimal comma "12,5" and normalized upstream per FR-GROWTH-05)
- **THEN** the growth chart plots the numeric value 12.5 correctly and does not drop, round away, re-locale-parse, or misplot the point (FR-CHART-02)

#### Scenario: Same-date measurements are deterministically ordered
- **WHEN** a plant has two measurements on the same calendar date
- **THEN** both are plotted as distinct points and the ascending order is tie-broken by row id ascending so the order is deterministic and reproducible (FR-CHART-02)

#### Scenario: Largest permitted height value scales the axis without breaking
- **WHEN** a plant has a measurement at the maximum height value FR-GROWTH-05 permits (the upstream-validated upper bound for a stored height)
- **THEN** the growth chart's value axis includes that value and the point is carried through unchanged, without the value being dropped, NaN, or re-parsed by the data-shaping step (FR-CHART-02)

### Requirement: Per-chart empty state
The system SHALL show a clear empty state in each chart when the plant has no corresponding data yet, distinct from a loading or error state (FR-CHART-03). When a chart's series is empty, the chart area SHALL render an explicit Ukrainian empty-state message instead of an empty, blank, or zeroed-axis plot.

#### Scenario: No watering events
- **WHEN** the Owner opens the detail view of a plant that has zero watering events
- **THEN** the watering chart area shows an explicit Ukrainian empty-state message rather than an empty/blank plot, a zeroed axis, or an error (FR-CHART-03)

#### Scenario: No measurements
- **WHEN** the Owner opens the detail view of a plant that has zero height measurements
- **THEN** the growth chart area shows an explicit Ukrainian empty-state message rather than an empty/blank plot, a zeroed axis, or an error (FR-CHART-03)

#### Scenario: Empty state is not an error
- **WHEN** a chart is in its empty state
- **THEN** the empty state is visually and semantically distinct from a load-failure error state and from a loading indicator (FR-CHART-03)

### Requirement: Charts reflect mutations
The system SHALL update each chart to reflect newly added, edited, or deleted events/measurements so the rendered points stay consistent with the current data (FR-CHART-04). The charts are pure derivations of the same row arrays the plant detail page loads; because the detail page is a dynamically rendered server component and each watering/measurement mutation revalidates the detail path, the page re-renders with fresh data and the charts re-derive their series automatically, with no separate subscription or client-side state.

#### Scenario: Add reflects in chart
- **WHEN** the Owner adds a watering event or a height measurement for the plant
- **THEN** the corresponding chart shows the new point within the same plant detail view, without a full page navigation initiated by the Owner (FR-CHART-04)

#### Scenario: Edit reflects in chart
- **WHEN** the Owner edits the date or value of an existing event/measurement
- **THEN** the corresponding chart point moves to its new position/value (FR-CHART-04)

#### Scenario: Delete reflects in chart
- **WHEN** the Owner deletes an event/measurement
- **THEN** the corresponding chart point is removed; if it was the last data point, the chart transitions to its empty state (FR-CHART-04, FR-CHART-03)

### Requirement: Charts are never the only way to read data
The system SHALL ensure the values shown in each chart are also available as a list/table on the same plant detail view, so charts are never the sole means of reading the data (NFR-A11Y-03). This is satisfied by the existing measurements list (FR-GROWTH-02) and waterings list (FR-WATER-03) already rendered on the plant detail view; the charts complement those lists and do not replace them.

#### Scenario: Watering values readable without the chart
- **WHEN** the Owner views a plant with watering events
- **THEN** the same watering values are accessible as the watering list/table (FR-WATER-03), independent of the chart rendering (NFR-A11Y-03)

#### Scenario: Growth values readable without the chart
- **WHEN** the Owner views a plant with height measurements
- **THEN** the same measurement values are accessible as the measurements list/table (FR-GROWTH-02), independent of the chart rendering (NFR-A11Y-03)

#### Scenario: Chart fails but data remains readable
- **WHEN** a chart fails to render
- **THEN** the underlying list/table still presents the values, so no data is made unreadable by a chart failure (NFR-A11Y-03)

### Requirement: Chart render performance
The system SHALL render each chart within 500 ms for a single plant with up to 365 data points (NFR-PERF-02), and SHALL still render all data points for datasets that exceed that supported maximum rather than failing or truncating.

#### Scenario: Within performance budget at upper bound
- **WHEN** a chart is rendered for a single plant holding up to 365 data points
- **THEN** the chart completes its initial render within 500 ms (locally verifiable in Phase 6) (NFR-PERF-02)

#### Scenario: Dataset exceeds the supported maximum
- **WHEN** a chart is rendered for a single plant holding more than 365 data points (e.g. 400+ events)
- **THEN** the chart still renders every data point with correct values — degrading on render time only (the 500 ms budget is no longer guaranteed above 365 points) — and SHALL NOT cap, drop, bucket, or truncate points, throw a render error, or fall back to the empty/error state (NFR-PERF-02)
