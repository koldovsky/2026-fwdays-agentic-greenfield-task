## ADDED Requirements

### Requirement: Per-metric trend labels in comparison output

When «vs previous» deltas are shown after a weigh-in, the comparison output SHALL append a
Ukrainian trend label (**прогрес**, **коливання**, or **без змін**) for each of the four metrics,
classified per FR-TREND-01..03. (FR-TREND-01, FR-TREND-02)

#### Scenario: Second entry shows labels on all four metrics

- **WHEN** a user logs a second weigh-in after an existing entry
- **THEN** each «Порівняно з попереднім» metric line includes a trend label for weight, fat %,
  muscle %, and BMI

#### Scenario: First entry omits trend labels

- **WHEN** a user logs their first weigh-in
- **THEN** no trend labels are shown (baseline message only)

#### Scenario: Weight from start line has no trend label

- **WHEN** a user has at least two weigh-ins and the «від старту» weight delta line is shown
- **THEN** that line shows the formatted delta only, without a trend label
