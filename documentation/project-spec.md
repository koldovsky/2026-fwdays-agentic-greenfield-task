# Pioneer Directive

> A minimalistic, deterministic, turn-based colony expedition game built as a demonstration of AI-augmented software development.

---

# 1. General Specification

## Overview

**Pioneer Directive** is a single-player, turn-based strategy game about leading humanity's first successful extrasolar colony.

The player commands an expedition ship with limited resources. Every turn presents new discoveries, opportunities and dangers. The objective is to find a suitable planet and establish a colony before resources or crew morale collapse.

The game intentionally focuses on decision making rather than movement or combat.

There is no world map. Gameplay is driven by procedural events and generated star systems.

Each run should last approximately **20–40 turns**.

Runs are deterministic and reproducible from a numeric seed.

---

## Design Goals

- Small but replayable
- Local-first
- Easy to learn
- Emergent storytelling
- High replay value through procedural generation
- Strong visual feedback
- No grinding
- No real-time mechanics

---

## Future Development Milestones

### Phase 2

- Probe launching
- Long-range sensors
- Planet scanning improvements
- Ship upgrades

### Phase 3

- Multiple planets per star system
- Planetary moons
- Asteroid belts
- Binary stars

### Phase 4

- Graphic improvements
- Animated transitions
- Planet illustrations
- Sound effects
- Ambient soundtrack

### Phase 5

Content Packs

The engine should be reusable for different settings.

Examples:

- Sea Exploration
- Fantasy Expedition
- Dungeon Delving
- Arctic Survival
- Jungle Exploration

Only events, resources and visuals change.

Core mechanics remain identical.

### Phase 6

Additional gameplay depth

- More planet properties
- More random events
- Story event chains
- Rare anomalies
- Alien civilizations
- Factions
- Difficulty modifiers

---

# 2. Technical Stack

Frontend

- SvelteKit
- TypeScript
- TailwindCSS

Storage

- LocalStorage

Rendering

- Native HTML
- CSS Grid/Flex
- Minimal SVG icons

Randomness

- Seeded PRNG

Deployment

- Static site

No backend.

No authentication.

No database.

Entire game must work offline.

---

# 3. Visual Style

Design language:

- Minimalistic
- Card-based
- Clean typography
- Dark interface
- Space terminal aesthetic

Primary colors

- Black
- Slate
- White
- Cyan
- Amber

Layout

Header

- Ship status

Center

- Current event card

Sidebar

- Resources
- Active modifiers

Footer

- Action buttons

Animations

- Short
- Subtle
- Functional

---

# 4. Gameplay Loop

Start Run

↓

Choose Loadout

↓

Generate Galaxy Seed

↓

Generate First Star System

↓

Turn Loop

↓

Resolve Event

↓

Update Resources

↓

Generate Next Turn

↓

Discover Candidate Planet

↓

Attempt Colonization

↓

Generate Colony

↓

Final Report

↓

Save Run History

---

# 5. Turn Specification

Each turn consists of:

1. Consume upkeep
2. Check loss conditions
3. Generate event
4. Present choices
5. Resolve consequences
6. Apply modifiers
7. Update ship status
8. Advance turn counter

Events include:

- Deep space
- Star system arrival
- Distress signal
- Ancient ruins
- Derelict ship
- Resource cache
- Solar storm
- Crew conflict
- Scientific discovery
- Pirate encounter
- Alien artifact
- Equipment failure

Each event provides 2–4 choices.

Choices affect resources and future probabilities.

---

# 6. Planet Generation

Every discovered planet receives generated properties.

## Temperature

- Frozen
- Cold
- Temperate
- Warm
- Hot

## Atmosphere

- None
- Thin
- Breathable
- Dense
- Toxic

## Gravity

- Low
- Standard
- High

## Water

- None
- Scarce
- Moderate
- Ocean

## Life

- None
- Microbial
- Primitive
- Advanced

## Resources

- Poor
- Average
- Rich

## Hazards

Examples

- Radiation
- Toxic spores
- Constant storms
- Volcanic activity
- Tidal locking
- Ice age

Planet suitability is calculated from all properties.

---

# 7. Resources

Primary resources

- Fuel
- Supplies
- Crew
- Morale
- Science
- Industry

Secondary values

- Hull Integrity
- Reputation
- Expedition Score

Resources may never become negative.

---

# 8. Starting Loadouts

Explorer

- +Science
- +Sensors
- -Cargo Capacity

Industrial

- +Industry
- +Fuel
- -Science

Generation Ship

- +Crew
- +Supplies
- -Mobility

Military Escort

- +Security
- +Hull
- -Diplomacy

Research Vessel

- +Science
- Better anomaly outcomes
- Lower industry

Every loadout changes event probabilities.

---

# 9. Ending Generation

The ending is generated from player decisions.

No predefined endings.

Instead, colony traits emerge from the final state.

Inputs include

- Resources
- Crew morale
- Science
- Industry
- Planet quality
- Number of explored systems
- Number of conflicts
- Random events survived

Possible colony traits

Government

- Democratic
- Technocracy
- Corporate
- Cooperative
- Military
- Theocracy
- Collective

Society

- Scientific
- Industrial
- Agricultural
- Isolationist
- Expansionist
- Pacifist
- Survivalist

Outcome

- Prosperous
- Stable
- Fragile
- Failed
- Legendary

The final report combines these into a narrative.

Example

> Colony Report #2041

Planet

TRS-492

Founded after

31 Turns

Result

Prosperous Scientific Technocracy

Final Score

7820

---

# 10. Achievement System

Examples

First Steps

Complete first expedition.

One More Turn

Reach turn 50.

Barely Alive

Colonize with 1 crew remaining.

Perfect Landing

Colonize a planet with maximum suitability.

Fuel Miser

Finish with less than 5 fuel.

Explorer

Visit 20 systems.

Archivist

Discover every event category.

Against All Odds

Colonize a hostile world.

Lucky Seed

Win without losing morale.

---

# 11. Seeds

Every run starts from a numeric seed.

The seed determines

- Events
- Star systems
- Planets
- Colony names
- Outcomes

Players may

- Enter a custom seed
- Replay previous seeds
- Share successful runs

Example

Seed: 824193

---

# 12. Colony Name Generation

Names are procedurally generated.

Format

Descriptor + Noun + Planet

Examples

Free Scientific Enclave

United Colonial Union

People's Cooperative

First Horizon Settlement

Orbital Commonwealth

Stellar Research Authority

Examples

Free Scientific Enclave of Epsilon-7

United Colonial Union of KX-114

Orbital Commonwealth of Helios-3

---

# 13. Run History

Every completed run is stored locally.

Each record includes

- Seed
- Date
- Turn count
- Final score
- Colony type
- Planet name
- Planet suitability
- Difficulty
- Expedition duration

Statistics

- Total runs
- Best score
- Average score
- Fastest victory
- Longest expedition
- Most successful loadout
- Favorite seed

Runs should be replayable from history.

---

# Non-Goals

The project intentionally excludes

- Multiplayer
- Online features
- Microtransactions
- Real-time gameplay
- Base building
- Tactical combat
- Complex economy
- Large technology trees

The focus remains on short, replayable expeditions driven by meaningful decisions.