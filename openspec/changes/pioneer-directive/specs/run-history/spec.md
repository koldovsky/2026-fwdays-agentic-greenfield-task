## ADDED Requirements

### Requirement: Run record persistence
Every completed run (victory or defeat) SHALL be saved as a RunRecord to LocalStorage immediately after the final report is generated.

#### Scenario: Run saved after colony report
- **WHEN** the colony report screen is shown
- **THEN** the run is immediately retrievable from LocalStorage under the history key

### Requirement: Run record fields
Each RunRecord SHALL contain: id, seed, date, turnCount, finalScore, colonyName, colonyType, planetName, planetSuitability, loadoutName, outcomeText, and victory flag.

#### Scenario: All fields populated
- **WHEN** a run record is retrieved from history
- **THEN** all required fields are present and non-null

### Requirement: Aggregate statistics
The history store SHALL compute and expose aggregate statistics: totalRuns, victoryCount, bestScore, averageScore, fastestVictory (min turns), longestExpedition (max turns), favoriteSeed (most replayed).

#### Scenario: Best score updates on new record
- **WHEN** a run with score 9000 is completed and the previous best was 7000
- **THEN** bestScore in statistics equals 9000

### Requirement: Run replay from history
The player SHALL be able to select any run from history and replay it using the same seed.

#### Scenario: Replay launches with stored seed
- **WHEN** the player clicks Replay on a history entry
- **THEN** a new run starts with the seed from that history record

### Requirement: History screen statistics display
The game SHALL provide a history screen showing the list of past runs and the aggregate statistics panel.

#### Scenario: Stats panel shows total runs
- **WHEN** the player opens the history screen after 5 completed runs
- **THEN** the totalRuns stat displays 5
