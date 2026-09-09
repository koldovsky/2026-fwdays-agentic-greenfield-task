## ADDED Requirements

### Requirement: Six-axis procedural generation
The planet generator SHALL assign one value per axis — Temperature, Atmosphere, Gravity, Water, Life, Resources — to every generated planet, selecting each using the seeded RNG.

#### Scenario: All axes populated
- **WHEN** generatePlanet() is called with a valid RNG and system index
- **THEN** the returned Planet object has non-null values for all six axes

### Requirement: Hazard assignment
The planet generator SHALL assign 0 to 3 hazards per planet, sampled without replacement from the hazard pool, using the seeded RNG.

#### Scenario: Hazard count in bounds
- **WHEN** a planet is generated
- **THEN** planet.hazards.length is between 0 and 3 inclusive

### Requirement: Suitability score derivation
The planet generator SHALL compute a suitability score from 5 to 100 by summing axis scores (Temperature max 25, Atmosphere max 30, Gravity max 15, Water max 15, Life max 10, Resources max 5) and subtracting 10 per hazard.

#### Scenario: Perfect planet scores 100
- **WHEN** a planet has Temperate, Breathable, Standard, Moderate, Advanced, Rich and 0 hazards
- **THEN** calculateSuitability() returns 100

#### Scenario: Hazard penalty applied
- **WHEN** a planet has 2 hazards
- **THEN** the final suitability score is 20 points lower than the same planet with 0 hazards (before clamping)

### Requirement: Deterministic from seed
The planet generator SHALL produce structurally identical planets when given identical seeds.

#### Scenario: Same seed same planet
- **WHEN** generatePlanet() is called twice with identically-seeded RNG instances
- **THEN** both Planet objects are structurally identical

### Requirement: Procedural planet naming
The planet generator SHALL assign a procedurally generated name using the seeded RNG in a format combining a prefix identifier, a numeric code, and an optional letter suffix.

#### Scenario: Name format matches spec
- **WHEN** a planet name is generated
- **THEN** it matches the pattern [Prefix]-[Number][Letter] or [Prefix] [Number]
