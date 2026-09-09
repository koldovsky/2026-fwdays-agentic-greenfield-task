## ADDED Requirements

### Requirement: Descriptor-Noun-Planet format
The colony name generator SHALL produce names in the format "[Descriptor] [Noun] of [PlanetName]", selecting Descriptor and Noun from curated word lists using the seeded RNG.

#### Scenario: Name follows format
- **WHEN** generateColonyName() is called
- **THEN** the result matches the pattern "[Word] [Word] of [PlanetName]"

### Requirement: Seeded determinism
Colony name generation SHALL use the same seeded RNG as all other procedural systems, ensuring the name is reproducible from the seed.

#### Scenario: Same seed same name
- **WHEN** generateColonyName() is called twice with identically-seeded RNG
- **THEN** both calls return the same colony name

### Requirement: Descriptor and Noun variety
The word lists SHALL contain at least 10 Descriptors and 10 Nouns to ensure meaningful naming variety across runs.

#### Scenario: Sufficient variety in names
- **WHEN** 20 colony names are generated with different seeds
- **THEN** no two names are identical
