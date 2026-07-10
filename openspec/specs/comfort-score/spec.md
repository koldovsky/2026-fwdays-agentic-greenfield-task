# Comfort Score Specification

## Purpose

The comfort-score capability turns daily forecast signals into a single 0–100
trip-readiness score and a short Ukrainian explanation for each day. Pure
scoring logic lives in framework-free `lib/scoring/comfort.ts` (`TC-PURE-01`);
UI layers map scores to badge colors and surface the upcoming weekend average
(`FR-COMFORT-04`, `FR-COMFORT-05`). Compare-table rendering belongs to the
`weekend-compare` capability and is out of scope here.

## Requirements

### Requirement: Pure daily comfort score function

The system SHALL expose `comfortScore(daily)` in `lib/scoring/comfort.ts` as a
**pure, total function** that returns `{ value: number; rationale: string }`
where `value` is an integer from 0 through 100 inclusive (`FR-COMFORT-01`,
`TC-PURE-01`).

#### Scenario: Warm dry day scores high

- **GIVEN** a daily input with feels-like 24 °C, precipitation probability 5 %,
  wind 8 km/h, cloud cover 15 %, and UV index 4
- **WHEN** `comfortScore(daily)` is called
- **THEN** `value` is greater than or equal to 70
- **AND** the result depends only on the input object (no I/O, clocks, or globals)

#### Scenario: Missing or non-finite input is rejected

- **GIVEN** a daily input where any required numeric field is `undefined`, `NaN`,
  or outside its valid range
- **WHEN** `comfortScore(daily)` is called
- **THEN** the function throws a deterministic validation error
- **AND** no partial `{ value, rationale }` object is returned

### Requirement: Comfort score weather inputs

The system SHALL compute each daily comfort score from exactly these forecast
fields: feels-like temperature (°C), precipitation probability (0–100 %), wind
speed (km/h), cloud cover (0–100 %), and UV index (`FR-COMFORT-02`).

#### Scenario: All five inputs influence the score

- **GIVEN** two daily inputs identical except precipitation probability (5 % vs
  80 %)
- **WHEN** `comfortScore` is called for each
- **THEN** the higher-precipitation day receives a strictly lower `value`
- **AND** the higher-precipitation day's rationale references the worsened
  condition in Ukrainian

#### Scenario: Extreme wind lowers comfort

- **GIVEN** two daily inputs identical except wind speed (10 km/h vs 55 km/h)
- **WHEN** `comfortScore` is called for each
- **THEN** the windy day receives a strictly lower `value`

### Requirement: Ukrainian comfort rationale

The system SHALL attach a single-sentence rationale in Ukrainian to every
comfort score. The rationale MUST be at most 80 characters, contain no emojis,
use calm practical tone (`BC-BRAND-01`), and MUST NOT contradict the day's
weather data (`FR-COMFORT-03`).

#### Scenario: Rationale length and language

- **GIVEN** any valid daily input
- **WHEN** `comfortScore(daily)` is called
- **THEN** `rationale` is one sentence in Ukrainian
- **AND** `rationale.length` is less than or equal to 80
- **AND** `rationale` contains no emoji characters

#### Scenario: Rainy day rationale does not sound pleasant

- **GIVEN** a daily input with precipitation probability at least 60 % and
  feels-like temperature below 15 °C
- **WHEN** `comfortScore(daily)` is called
- **THEN** `value` is less than 40
- **AND** `rationale` does not contain the word «приємно» (case-insensitive)
- **AND** `rationale` describes wet or cold discomfort, not fair-weather praise

#### Scenario: High UV is reflected honestly

- **GIVEN** a daily input with UV index at least 8 and otherwise mild weather
- **WHEN** `comfortScore(daily)` is called
- **THEN** `rationale` mentions sun or UV exposure
- **AND** `rationale` does not claim ideal shade or cool conditions

### Requirement: Comfort badge tier helper

The system SHALL map each daily comfort `value` to badge tier data for forecast
day-card display: **green** when `value ≥ 70`, **yellow** when `40 ≤ value ≤ 69`,
and **red** when `value < 40`. The forecast UI slice SHALL render that tier in
the day card (`FR-COMFORT-04`, `DESIGN.md` Sky Calm tokens).

#### Scenario: Green tier for comfortable days

- **GIVEN** a comfort result with `value` 87
- **WHEN** the badge tier helper is applied
- **THEN** the tier is `green`

#### Scenario: Yellow tier for middling days

- **GIVEN** a comfort result with `value` 55
- **WHEN** the badge tier helper is applied
- **THEN** the tier is `yellow`

#### Scenario: Red tier for poor days

- **GIVEN** a comfort result with `value` 28
- **WHEN** the badge tier helper is applied
- **THEN** the tier is `red`

#### Scenario: Boundary values map correctly

- **GIVEN** comfort results with `value` 70, 69, 40, and 39
- **WHEN** the badge tier helper is applied to each
- **THEN** tiers are `green`, `yellow`, `yellow`, and `red` respectively

### Requirement: Upcoming weekend comfort highlight data

The system SHALL compute upcoming weekend comfort highlight data as the
arithmetic mean (rounded to nearest integer) of Saturday and Sunday daily scores
for the active location's local calendar dates. The forecast UI slice SHALL
display that highlight above the seven-day forecast grid (`FR-COMFORT-05`).

#### Scenario: Weekend average from Saturday and Sunday

- **GIVEN** a seven-day forecast where Saturday scores 80 and Sunday scores 60
- **WHEN** the weekend highlight is computed for that grid
- **THEN** the highlighted weekend score is 70
- **AND** the highlight appears above the day-card grid, not inside a single card

#### Scenario: Partial week without upcoming weekend

- **GIVEN** a forecast window that does not include the next Saturday and Sunday
  in the location timezone
- **WHEN** the weekend highlight is requested
- **THEN** no weekend highlight value is returned for the UI to render
- **AND** individual day scores still display normally

#### Scenario: Weekend highlight uses the same scoring function

- **GIVEN** Saturday and Sunday daily forecast rows with valid comfort inputs
- **WHEN** the weekend highlight is computed
- **THEN** each day's score equals `comfortScore(thatDay).value`
- **AND** the highlight value equals the rounded average of those two scores

## Exclusions

- Scoring weight constants and threshold tuning are implementation details; only
  observable outcomes above are normative.
- Side-by-side multi-city weekend comparison UI is owned by `weekend-compare`
  (`FR-COMPARE-02`), not this capability.
- Badge rendering markup, tooltip placement, and animation are UI concerns
  outside `lib/scoring/comfort.ts`.
