# Trend hint — implementation delta

Implements the baseline capability. Requirements below match
`openspec/specs/trend-hint/spec.md`; no behavioural change from baseline.

## ADDED Requirements

### Requirement: Compute the recent move (FR-TREND-01)
The system SHALL compute the active currency's 7-day move versus UAH as a signed
percentage from its official rate history.

#### Scenario: Seven-day move is computed
- **WHEN** the active currency has at least a 7-day history
- **THEN** a signed percentage move over that window is computed

### Requirement: Calm one-sentence read (FR-TREND-02, BC-BRAND-01)
The system SHALL render one calm Ukrainian sentence leading with direction and
magnitude, with no exclamation marks.

#### Scenario: Strengthening reads calmly
- **WHEN** the currency strengthened ~1.2% over the week
- **THEN** a sentence like «Долар за тиждень зміцнів на 1,2% до гривні» is shown

### Requirement: Flat band and tone source of truth (FR-TREND-03)
A move within ±0.05% SHALL read as flat; the tone (up / down / flat) SHALL come
from the single `trendTone` source of truth.

#### Scenario: Tiny move reads as flat
- **WHEN** the weekly move is within ±0.05%
- **THEN** the hint reads as «майже без змін» with a flat tone
