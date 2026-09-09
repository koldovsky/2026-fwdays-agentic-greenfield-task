## ADDED Requirements

### Requirement: Upkeep consumption
The turn engine SHALL consume a fixed upkeep cost per resource each turn before any event is processed. Resources SHALL never go below zero after upkeep.

#### Scenario: Fuel upkeep applied
- **WHEN** a new turn begins and the player has 10 fuel
- **THEN** the upkeep amount is subtracted and fuel is updated before the event card is shown

#### Scenario: Resource floor enforced
- **WHEN** upkeep would reduce a resource below zero
- **THEN** the resource is clamped to zero rather than becoming negative

### Requirement: Loss condition evaluation
The turn engine SHALL evaluate loss conditions after upkeep and before event generation. A run ends in defeat when Crew reaches 0, Fuel reaches 0, or Morale reaches 0.

#### Scenario: Crew depletion triggers defeat
- **WHEN** upkeep reduces Crew to 0
- **THEN** the game transitions to a defeat screen without generating an event

#### Scenario: Multiple loss conditions on same turn
- **WHEN** both Fuel and Morale reach 0 simultaneously
- **THEN** defeat is triggered; the primary loss reason displayed is the first resource to hit zero

### Requirement: Event generation
The turn engine SHALL procedurally select one event each turn using the seeded RNG and the current loadout's probability weights.

#### Scenario: Seeded event selection is deterministic
- **WHEN** two runs start with the same numeric seed and make identical choices
- **THEN** the same event appears on every corresponding turn

### Requirement: Choice resolution
The turn engine SHALL apply a chosen event option's costs, rewards, and modifier additions to the current GameState atomically via the Reducer.

#### Scenario: Cost and reward applied together
- **WHEN** the player selects a choice with cost {fuel: -5} and reward {science: +10}
- **THEN** fuel decreases by 5 and science increases by 10 in the same state transition

#### Scenario: Insufficient resource blocks locked choice
- **WHEN** a choice requires a resource the player does not have enough of
- **THEN** that choice is rendered disabled and its fail message is displayed

### Requirement: Modifier application
Active modifiers SHALL be applied each turn during upkeep. A modifier with duration > 0 SHALL have its remaining duration decremented each turn; a modifier reaching 0 SHALL be removed from active modifiers.

#### Scenario: Modifier expires correctly
- **WHEN** a modifier has duration = 1 at turn start
- **THEN** its effect is applied this turn and it is removed from the active modifier list afterward

### Requirement: Turn counter advance
The turn engine SHALL increment the turn counter by 1 at the end of each fully resolved turn.

#### Scenario: Turn count reflects all completed turns
- **WHEN** the player completes turn 10
- **THEN** the UI displays turn 11 as the current turn
