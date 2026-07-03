# scoring-engine Specification

## Purpose
TBD - created by archiving change add-scoring-engine. Update Purpose after archive.
## Requirements
### Requirement: Competitive score from coefficients and benefits
The engine SHALL compute a competitive score as
`Σ(subject_score × subject_weight) × (1 + benefit)`, where `benefit` is the sum of
the active benefit bonuses, and SHALL cap the result at 200 (the NMT-derived
ceiling). Score inputs SHALL be clamped to the valid NMT range 100–200. (Traces:
FR-SCORE-01.)

#### Scenario: Weighted sum times benefit multiplier
- **WHEN** `competitiveScore` is computed for a program, a set of subject scores, and a set of benefits
- **THEN** the result equals the weighted sum of `score × coefficient` over the program's coefficient keys, multiplied by `(1 + total_benefit_bonus)`

#### Scenario: No active benefits leaves the raw weighted sum
- **WHEN** no benefit toggles are active
- **THEN** the competitive score equals the raw weighted sum (multiplier `1 + 0`)

#### Scenario: Score is capped at 200
- **WHEN** the weighted sum times the benefit multiplier exceeds 200
- **THEN** the competitive score is capped at 200 and never exceeds it

#### Scenario: Out-of-range inputs are clamped
- **WHEN** a subject score below 100 or above 200 (or a non-finite value) is passed through `clampScore`
- **THEN** it is clamped into the 100–200 range and rounded to an integer

### Requirement: Chance estimate as a logistic curve
The engine SHALL estimate the chance percentage as a logistic function of the
difference between the competitive score and the program's most recent cutoff
(2024): `chance% = logistic(competitive − cutoff2024, k)`. The curve steepness `k`
SHALL grow with state-funded seats as `k = 3.0 + min(1.4, budgetSeats / 90)`. The
chance SHALL be clamped to 2–98 % — never 0 % ("impossible") nor 100 %
("guaranteed"). (Traces: FR-SCORE-02, BC-HONESTY-01.)

#### Scenario: Logistic of the score gap
- **WHEN** the chance is computed for a competitive score and the program's 2024 cutoff
- **THEN** it equals `round(100 / (1 + exp(-diff / k)))` where `diff = competitive − cutoff2024` and `k = 3.0 + min(1.4, budgetSeats / 90)`

#### Scenario: Chance is clamped to 2–98 percent
- **WHEN** the logistic value would fall below 2 % or above 98 %
- **THEN** it is clamped to 2 % or 98 % respectively (never 0 % or 100 %)

#### Scenario: More seats flatten the curve
- **WHEN** two programs differ only in `budgetSeats`
- **THEN** the program with more seats has a larger `k`, up to a cap where `budgetSeats / 90 ≥ 1.4` (so `k` never exceeds `4.4`)

### Requirement: Uncertainty band always returned
The engine SHALL always return an uncertainty band `[lo, hi]` alongside the point
chance, computed as `[logistic(diff − σ), logistic(diff + σ)]`, where σ is the
population standard deviation of the three cutoff years floored at `1.6`. The band
SHALL be ordered so `lo ≤ hi`, and `evaluate()` SHALL never return a bare chance
without a band. (Traces: FR-SCORE-02, BC-HONESTY-01.)

#### Scenario: Band brackets the point chance
- **WHEN** `evaluate()` scores a program
- **THEN** it returns a `band` `[lo, hi]` with `lo = logistic(diff − σ)` and `hi = logistic(diff + σ)`
- **AND** `lo ≤ hi` (the band is ordered low-to-high)

#### Scenario: Volatility uses population stdev floored at 1.6
- **WHEN** cutoff volatility σ is computed for a program
- **THEN** σ equals the population standard deviation of the 2022/2023/2024 cutoffs, but never less than `1.6`

#### Scenario: A band is always present
- **WHEN** any program is evaluated for any profile
- **THEN** the result includes a band and never a guarantee (no bare 0 %/100 % point value, always a lo–hi range)

### Requirement: Risk category from the point chance
The engine SHALL map the point chance to a risk category using the §6 thresholds:
Safe (`safe`) at chance ≥ 75 %, Realistic (`real`) at 40–74 %, and Reach (`dream`)
at < 40 %. (Traces: FR-SCORE-03.)

#### Scenario: Safe category at or above 75 percent
- **WHEN** the point chance is 75 % or higher
- **THEN** the category is `safe`

#### Scenario: Realistic category from 40 to 74 percent
- **WHEN** the point chance is between 40 % and 74 % inclusive
- **THEN** the category is `real`

#### Scenario: Reach category below 40 percent
- **WHEN** the point chance is below 40 %
- **THEN** the category is `dream`

### Requirement: Elective fit
The engine SHALL report whether a program accepts the applicant's chosen elective
("4th") subject, so downstream capabilities can mark ineligible programs. (Traces:
FR-SCORE-03.)

#### Scenario: Program accepts the elective
- **WHEN** the applicant's chosen elective is in the program's accepted electives
- **THEN** `fits` is `true`

#### Scenario: Program does not accept the elective
- **WHEN** the applicant's chosen elective is not among the program's accepted electives
- **THEN** `fits` is `false`

### Requirement: Pure, instant recomputation
All scoring functions SHALL be pure — no UI, no storage, no I/O — so results are
deterministic for fixed inputs and a full recompute across the whole dataset
completes in under 100 ms on any input change. (Traces: NFR-PERF-01.)

#### Scenario: Deterministic for fixed inputs
- **WHEN** `evaluate()` is called twice with identical program, scores, benefits, and elective
- **THEN** it returns identical results (no reliance on external state, time, or randomness)

#### Scenario: Full-dataset recompute under 100 ms
- **WHEN** every program in the dataset is re-evaluated after an input change
- **THEN** the full recompute completes in under 100 ms

