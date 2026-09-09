## ADDED Requirements

### Requirement: Five defined loadouts
The game SHALL offer exactly 5 starting loadouts: Explorer, Industrial, Generation Ship, Military Escort, and Research Vessel. Each SHALL have a unique ID, name, description, bonus resource deltas, a trait name, and a trait description.

#### Scenario: All five loadouts available at selection
- **WHEN** the loadout selection screen is shown
- **THEN** exactly 5 loadout cards are rendered, one per defined loadout

### Requirement: Bonus resource application
The chosen loadout's bonusResources SHALL be applied to the initial GameState resources before the first turn begins.

#### Scenario: Explorer bonus applied
- **WHEN** the player selects the Explorer loadout
- **THEN** the starting Science resource is higher than the default base value

### Requirement: Event probability modification
Each loadout SHALL carry a set of category weight modifiers applied to event generation for the duration of the run.

#### Scenario: Military Escort reduces diplomacy events
- **WHEN** the player selects Military Escort and runs a long game
- **THEN** events tagged with diplomacy or cooperation appear less frequently

### Requirement: Loadout selection is one-time
The loadout SHALL be chosen once per run at game start and SHALL NOT be changeable during a run.

#### Scenario: No loadout switch mid-run
- **WHEN** the player is in the turn loop
- **THEN** there is no UI element that allows changing the active loadout
