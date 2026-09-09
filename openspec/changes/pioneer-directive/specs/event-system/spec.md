## ADDED Requirements

### Requirement: 12 event categories
The event system SHALL contain events across all 12 categories defined in the project spec: Deep Space, Star System Arrival, Distress Signal, Ancient Ruins, Derelict Ship, Resource Cache, Solar Storm, Crew Conflict, Scientific Discovery, Pirate Encounter, Alien Artifact, Equipment Failure.

#### Scenario: All categories represented
- **WHEN** the event data is loaded
- **THEN** at least one event exists for each of the 12 categories

### Requirement: 2 to 4 choices per event
Every event SHALL have between 2 and 4 player choices. Each choice SHALL have a result text, optional resource costs, optional resource rewards, and an optional modifier to add.

#### Scenario: Choice count within bounds
- **WHEN** any event is rendered
- **THEN** the number of visible choice buttons is between 2 and 4 inclusive

### Requirement: Requirement gating
A choice MAY specify a resource requirement. If the player's current resource level is below the threshold, the choice SHALL be rendered in a disabled state with the fail message shown.

#### Scenario: Locked choice visible but not selectable
- **WHEN** a choice requires Crew >= 15 and the player has Crew = 8
- **THEN** the choice button is visible, marked as locked, and cannot be clicked

### Requirement: Event chain support
An event choice MAY specify a nextEventId. When a choice with nextEventId is selected, the turn engine SHALL load and display the linked event instead of advancing to the next turn.

#### Scenario: Chain event loads correctly
- **WHEN** the player selects a choice with nextEventId = "ancient_ruins_excavation"
- **THEN** the event card transitions to the chained event without advancing the turn counter

### Requirement: Loadout probability weights
The event system SHALL allow each event category to have a weight modifier per loadout. Explorer loadout SHALL increase probability of Scientific Discovery and Alien Artifact events.

#### Scenario: Explorer loadout increases science events
- **WHEN** the player selects the Explorer loadout and runs 100 turns
- **THEN** Scientific Discovery and Alien Artifact events appear statistically more often than with default weights
