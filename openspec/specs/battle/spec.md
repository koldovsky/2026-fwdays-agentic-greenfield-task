# battle Specification

## Purpose
TBD - created by archiving change github-battle-mvp. Update Purpose after archive.
## Requirements
### Requirement: Parallel side-by-side battle
`/battle/[user1]/[user2]` SHALL fetch both users in parallel and lay them out
side-by-side. (FR-BATTLE-01)

#### Scenario: Both loaded in parallel
- **WHEN** the battle page loads
- **THEN** both users' data is fetched in parallel and rendered side-by-side

### Requirement: Sequential metric reveal
The fifteen metrics SHALL reveal sequentially with a short stagger between rows; each
row SHALL show both users' values for that metric. (FR-BATTLE-02)

#### Scenario: Rows stagger in
- **WHEN** the battle runs with motion allowed
- **THEN** metric rows reveal one after another, each showing both users' values

### Requirement: Per-round winner highlighting
For each metric the higher value SHALL be highlighted as that round's winner; a tie
SHALL highlight neither and be marked a draw. (FR-BATTLE-03)

#### Scenario: Higher value wins the round
- **WHEN** two users have different values for a metric
- **THEN** the higher value is highlighted as the round winner

#### Scenario: Tie is a draw
- **WHEN** two users have equal values for a metric
- **THEN** neither is highlighted and the round is marked a draw

### Requirement: Animated tally and winner banner
After the rounds an animated counter SHALL tally each user's total score, and the
overall winner SHALL be announced with a banner. (FR-BATTLE-04)

#### Scenario: Winner announced
- **WHEN** all rounds have revealed
- **THEN** an animated counter tallies each total and a banner announces the overall winner

### Requirement: Shareable battle URL
Both usernames SHALL live in the route path so a battle is a shareable URL, and
deep-linking to `/battle/{u1}/{u2}` SHALL run the battle directly. (FR-BATTLE-05)

#### Scenario: Deep link
- **WHEN** a visitor opens `/battle/torvalds/gaearon` directly
- **THEN** the battle runs for those users without prior landing interaction

### Requirement: Per-side error degradation
If one user fails to load (404 or rate-limit), the battle SHALL degrade to an explicit
per-side error state rather than crashing. (FR-BATTLE-06, FR-DATA-05, FR-DATA-06)

#### Scenario: One side fails
- **WHEN** one user returns 404 or a rate-limit error
- **THEN** that side shows an explicit error state and the page does not crash

### Requirement: Reduced-motion instant result
When `prefers-reduced-motion` is set, the reveal sequence SHALL collapse to an
instant, non-animated result. (FR-BATTLE-07, NFR-A11Y-03)

#### Scenario: Reduced motion
- **WHEN** the battle loads with `prefers-reduced-motion` set
- **THEN** all rounds, tally, and winner appear instantly with no animation

### Requirement: Pure scoring function
`scoreBattle(a: UserStats, b: UserStats): BattleResult` SHALL be a pure function in
`lib/scoring/battle.ts` with no framework imports. (FR-SCORE-01, TC-PURE-01)

#### Scenario: Deterministic scoring
- **WHEN** `scoreBattle` receives two fixed `UserStats`
- **THEN** it returns the same `BattleResult` with no framework or DOM dependency

### Requirement: Point allocation
For each of the fifteen metrics the higher value SHALL score 1 point; an exact tie
SHALL score 0.5 to each; the total is out of 15. (FR-SCORE-02)

#### Scenario: Higher value scores
- **WHEN** user A exceeds user B on a metric
- **THEN** A gains 1 point and B gains 0 for that metric

#### Scenario: Tie splits the point
- **WHEN** two users tie on a metric
- **THEN** each gains 0.5 for that metric

### Requirement: Winner or draw with per-metric outcomes
The result SHALL name a winner, or a `draw` when totals are equal, and SHALL include
per-metric outcomes for the UI to render. (FR-SCORE-03)

#### Scenario: Winner named
- **WHEN** totals differ after all fifteen metrics
- **THEN** the result names the higher-total user as winner and includes each metric's outcome

#### Scenario: Draw
- **WHEN** totals are equal
- **THEN** the result is a `draw`

### Requirement: Higher-is-better direction documented
Scoring direction SHALL be "higher is better" for all fifteen metrics, and this
assumption SHALL be documented in the function. (FR-SCORE-04)

#### Scenario: Direction assumption
- **WHEN** a developer reads `scoreBattle`
- **THEN** the "higher is better" assumption for all fifteen metrics is documented in the function

