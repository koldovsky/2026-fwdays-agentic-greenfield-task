## ADDED Requirements

### Requirement: Nine achievements defined
The game SHALL include the following achievements: First Steps, One More Turn, Barely Alive, Perfect Landing, Fuel Miser, Veteran Explorer, Against All Odds, Inspiring Leader (Lucky Seed), and Archivist.

#### Scenario: All nine achievements present in initial state
- **WHEN** the game is launched for the first time
- **THEN** nine achievement entries exist, all with unlocked = false

### Requirement: Achievement unlock conditions
Each achievement SHALL unlock when its condition is met during or at the end of a run, as defined in the spec.

#### Scenario: First Steps unlocked on first completed run
- **WHEN** the player completes their very first expedition
- **THEN** the First Steps achievement is marked as unlocked

#### Scenario: One More Turn unlocked at turn 50
- **WHEN** the turn counter reaches 50 in any run
- **THEN** the One More Turn achievement is unlocked immediately

#### Scenario: Barely Alive requires exactly 1 crew on victory
- **WHEN** the player colonizes with crew = 1
- **THEN** the Barely Alive achievement is unlocked

### Requirement: Achievement persistence
Unlocked achievements SHALL be persisted to LocalStorage and survive page reloads. An achievement unlocked once SHALL never revert to locked.

#### Scenario: Achievement survives reload
- **WHEN** an achievement is unlocked and the page is refreshed
- **THEN** the achievement is still shown as unlocked

### Requirement: Unlock notification
The game SHALL display a brief visual notification when a new achievement is unlocked during play.

#### Scenario: Unlock toast shown
- **WHEN** an achievement is unlocked during a run
- **THEN** a non-blocking toast or banner briefly appears showing the achievement name
