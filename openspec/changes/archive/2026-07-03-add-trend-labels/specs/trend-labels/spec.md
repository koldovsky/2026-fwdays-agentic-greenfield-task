## ADDED Requirements

### Requirement: Trend labels for weight, fat %, and BMI

For weight (kg), fat (%), and BMI deltas, the system SHALL classify the change as **прогрес**
when the delta is negative (decrease), **коливання** when the delta is positive (increase), and
**без змін** when the absolute delta is strictly less than the stable threshold. (FR-TREND-01)

#### Scenario: Weight decrease is progress

- **WHEN** weight delta vs previous entry is −0.6 kg
- **THEN** the weight trend label is **прогрес**

#### Scenario: Fat increase is fluctuation

- **WHEN** fat % delta vs previous entry is +0.3 percentage points
- **THEN** the fat trend label is **коливання**

#### Scenario: BMI within threshold is stable

- **WHEN** BMI delta vs previous entry is +0.1
- **THEN** the BMI trend label is **без змін**

### Requirement: Inverted trend labels for muscle %

For muscle (%) deltas, the system SHALL classify **прогрес** when the delta is positive
(increase), **коливання** when the delta is negative (decrease), and **без змін** when the
absolute delta is strictly less than the stable threshold. (FR-TREND-02)

#### Scenario: Muscle increase is progress

- **WHEN** muscle % delta vs previous entry is +0.2 percentage points
- **THEN** the muscle trend label is **прогрес**

#### Scenario: Muscle decrease is fluctuation

- **WHEN** muscle % delta vs previous entry is −0.3 percentage points
- **THEN** the muscle trend label is **коливання**

#### Scenario: Muscle within threshold is stable

- **WHEN** muscle % delta vs previous entry is −0.1
- **THEN** the muscle trend label is **без змін**

### Requirement: Stable threshold constant

The stable threshold for all metrics SHALL be **0.2** in the metric's native unit (kilograms for
weight, percentage points for fat %, muscle %, and BMI) unless changed in code. (FR-TREND-03)

#### Scenario: Delta at threshold boundary is not stable

- **WHEN** weight delta vs previous entry is exactly −0.2 kg
- **THEN** the weight trend label is **прогрес** (not **без змін**)

#### Scenario: Delta just below threshold is stable

- **WHEN** fat % delta vs previous entry is +0.19 percentage points
- **THEN** the fat trend label is **без змін**
