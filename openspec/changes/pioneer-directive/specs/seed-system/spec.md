## ADDED Requirements

### Requirement: Numeric seed drives all randomness
Every run SHALL be initialized with a numeric seed. All procedural generation — events, planets, colony names, outcomes — SHALL derive exclusively from this seeded RNG, making runs fully reproducible.

#### Scenario: Same seed produces identical run
- **WHEN** two runs start with seed 824193 and the player makes identical choices
- **THEN** every event, planet, and outcome is identical across both runs

### Requirement: Random seed on new game
The game SHALL automatically generate a random numeric seed when the player starts a new run without specifying a seed.

#### Scenario: Random seed generated
- **WHEN** the player starts a new game without entering a custom seed
- **THEN** a random integer seed is generated and displayed on the UI

### Requirement: Custom seed input
The game SHALL allow the player to enter a custom numeric seed before starting a run.

#### Scenario: Custom seed accepted
- **WHEN** the player enters 824193 in the seed input field and starts the game
- **THEN** the run uses that seed and it appears in the run history record

### Requirement: Seed display and sharing
The active seed SHALL be visible to the player during a run. After a run ends, the seed SHALL appear in the colony report so the player can share or replay it.

#### Scenario: Seed shown in colony report
- **WHEN** the colony report screen is displayed
- **THEN** the numeric seed used for that run is shown prominently
