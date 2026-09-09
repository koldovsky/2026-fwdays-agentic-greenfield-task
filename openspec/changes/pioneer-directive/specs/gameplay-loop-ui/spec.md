## ADDED Requirements

### Requirement: Complete player flow
The UI SHALL implement the full gameplay flow defined in the spec: Start Run -> Loadout Selection -> Galaxy Seed Display -> Turn Loop -> Colonization Attempt -> Colony Report -> Run History save.

#### Scenario: Player can complete a full run
- **WHEN** a player starts a new game, selects a loadout, plays through turns, and colonizes a planet
- **THEN** a colony report is shown and the run is saved to history without any dead-end or broken state

### Requirement: Layout structure
The UI SHALL implement the four-region layout: Header (ship status), Center (event card), Sidebar (resources + modifiers), Footer (action buttons).

#### Scenario: Four regions always visible during turn loop
- **WHEN** the player is in the turn loop
- **THEN** all four layout regions are simultaneously visible without scrolling on a 1280x800 viewport

### Requirement: Dark space-terminal aesthetic
The UI SHALL use a dark interface with the color palette defined in the spec: Black, Slate, White, Cyan, Amber. Typography SHALL be clean and minimal.

#### Scenario: No light backgrounds in game view
- **WHEN** the game UI is rendered during a turn
- **THEN** no element has a white or light-gray background color

### Requirement: Unidirectional data-flow
All UI state changes SHALL flow through the Reducer pattern defined in ARCHITECTURE.md: Events dispatch Actions, the Reducer returns a new GameState, the Renderer re-renders from the new state.

#### Scenario: State change is always via reducer
- **WHEN** any player action triggers a state change
- **THEN** the state is updated exclusively through a reducer call, not via direct mutation

### Requirement: Offline capability
The entire game SHALL function without a network connection. No assets, fonts, or data SHALL be fetched from a remote server at runtime.

#### Scenario: Game works offline
- **WHEN** the network is disabled and the page is loaded from the local dev server
- **THEN** all game features work normally with no loading errors
