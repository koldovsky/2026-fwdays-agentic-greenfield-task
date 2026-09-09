## ADDED Requirements

### Requirement: Colonization attempt conditions
The player SHALL be able to attempt colonization on any discovered planet with suitability >= 20. Attempting colonization on a planet with suitability < 20 SHALL be blocked with an explanatory message.

#### Scenario: High-suitability planet allows colonization
- **WHEN** the player has discovered a planet with suitability = 72
- **THEN** a "Colonize" action button is available

#### Scenario: Low-suitability planet blocks colonization
- **WHEN** the only discovered planet has suitability = 15
- **THEN** the colonize button is absent or disabled with a tooltip explaining the requirement

### Requirement: Government derivation
The ending generator SHALL derive the colony government from the final resource state and loadout as defined in the spec: Military -> Military Junta variants, High Science -> Technocracy variants, High Industry + Low Reputation -> Corporate variants, etc.

#### Scenario: High science produces technocracy
- **WHEN** the final science resource is above 65
- **THEN** the generated government is one of the technocracy variants

### Requirement: Society derivation
The ending generator SHALL determine colony society from the highest primary resource among science, industry, and supplies, falling back to planet suitability and other factors.

#### Scenario: Science leads to scientific society
- **WHEN** science is the highest of the three tracked resources
- **THEN** the colony society is "Scientific"

### Requirement: Outcome derivation
The ending generator SHALL derive one of five outcomes: Legendary, Prosperous, Stable, Fragile, or Failed, based on planet suitability, crew count, morale, and supplies thresholds.

#### Scenario: High suitability and good resources yields Prosperous
- **WHEN** suitability >= 80, crew > 20, morale > 50, supplies > 30
- **THEN** the outcome is "Prosperous"

### Requirement: Narrative generation
The ending generator SHALL compose a multi-paragraph narrative combining the colony name, planet description, government, society, and outcome into a unique textual report.

#### Scenario: Narrative references planet name
- **WHEN** the colony report is generated
- **THEN** the planet name appears in the narrative text

### Requirement: Expedition score calculation
The ending generator SHALL compute a final numeric expedition score. Victory score starts at 2000 and adds planet suitability * 50, resource remainders, and a turn-efficiency bonus (max 1000 at turn 1, decreasing by 40 per turn).

#### Scenario: Early victory scores higher
- **WHEN** two otherwise identical runs end on turn 15 vs turn 35
- **THEN** the turn-15 run has a higher final score
