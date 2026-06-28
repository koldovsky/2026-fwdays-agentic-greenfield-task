## ADDED Requirements

### Requirement: Pure comfortScore function

The system SHALL expose a pure function `comfortScore(day: ForecastDay): { value: number; rationale: string }` in `lib/scoring/comfort.ts`. The function SHALL have no side effects, no framework dependencies (TC-PURE-01), and SHALL accept a single `ForecastDay` argument. `value` SHALL be an integer in the range 0–100 inclusive. `rationale` SHALL be a single Ukrainian sentence of at most 80 characters with no emoji, sourced from `lib/i18n/uk.ts`.

#### Scenario: All inputs in comfortable range

- **WHEN** `feelsLikeMaxC` is between 18 and 26, `precipProbability` ≤ 20, `windSpeedKmh` ≤ 20, `cloudCoverPercent` ≤ 40, `uvIndexMax` ≤ 5
- **THEN** `value` is ≥ 70 and `rationale` is the `comfort.good` Ukrainian string

#### Scenario: Very cold feels-like temperature

- **WHEN** `feelsLikeMaxC` ≤ 0
- **THEN** `value` is < 40 and `rationale` is the `comfort.cold` Ukrainian string

#### Scenario: Very hot feels-like temperature

- **WHEN** `feelsLikeMaxC` ≥ 35
- **THEN** `value` is < 40 and `rationale` is the `comfort.hot` Ukrainian string

#### Scenario: High precipitation probability

- **WHEN** `precipProbability` ≥ 70 and feels-like temperature is in the comfortable range
- **THEN** `value` is < 70 and `rationale` is the `comfort.rainy` Ukrainian string

#### Scenario: High wind speed

- **WHEN** `windSpeedKmh` ≥ 50 and precipitation and temperature are comfortable
- **THEN** `value` is < 70 and `rationale` is the `comfort.windy` Ukrainian string

#### Scenario: Return value is always an integer in 0..100

- **WHEN** `comfortScore` is called with any valid `ForecastDay`
- **THEN** `value` is an integer satisfying `0 ≤ value ≤ 100`

#### Scenario: Rationale string satisfies voice constraints

- **WHEN** `comfortScore` is called for any valid `ForecastDay`
- **THEN** `rationale.length` is ≤ 80 and `rationale` contains no emoji characters

---

### Requirement: Comfort badge on each day card

Each day card in the 7-day forecast grid SHALL display a colored comfort badge showing the numeric score. Badge color SHALL follow the thresholds: green (`--comfort-good-*` tokens) for score ≥ 70, yellow (`--comfort-ok-*` tokens) for score 40–69, red (`--comfort-poor-*` tokens) for score < 40. The badge SHALL have an accessible `aria-label` in Ukrainian, e.g. "Комфорт: 82".

#### Scenario: High comfort score badge

- **WHEN** `comfortScore(day).value` is ≥ 70
- **THEN** the badge renders with the green design-system tokens (`--comfort-good-bg`, `--comfort-good-text`) and displays the numeric value

#### Scenario: Medium comfort score badge

- **WHEN** `comfortScore(day).value` is between 40 and 69 inclusive
- **THEN** the badge renders with the yellow design-system tokens (`--comfort-ok-bg`, `--comfort-ok-text`)

#### Scenario: Low comfort score badge

- **WHEN** `comfortScore(day).value` is < 40
- **THEN** the badge renders with the red design-system tokens (`--comfort-poor-bg`, `--comfort-poor-text`)

#### Scenario: Badge is accessible

- **WHEN** a screen reader focuses the comfort badge
- **THEN** the element has `aria-label="Комфорт: <value>"` where `<value>` is the numeric score

---

### Requirement: Weekend comfort highlight

The system SHALL render a `WeekendComfortBanner` component above the 7-day card row when both Saturday and Sunday are present in the forecast `days` array. The banner SHALL display the average comfort score for the upcoming Saturday and Sunday, the label "Вихідні" in Ukrainian, and the rationale from the higher-scoring of the two days. The banner SHALL use the same badge color thresholds as individual day cards.

#### Scenario: Both Saturday and Sunday in forecast

- **WHEN** the `days` array contains entries for the upcoming Saturday (getDay() === 6) and Sunday (getDay() === 0)
- **THEN** the banner renders above the day-card row with the averaged score and "Вихідні" label

#### Scenario: Weekend not fully in forecast window

- **WHEN** the `days` array does not contain both a Saturday and a Sunday
- **THEN** the banner is not rendered and no error is thrown

#### Scenario: Weekend banner color follows averaged score

- **WHEN** the averaged Sat + Sun score is ≥ 70
- **THEN** the banner uses the green comfort tokens; for 40–69 yellow; for < 40 red
