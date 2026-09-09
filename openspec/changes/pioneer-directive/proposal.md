## Why

Pioneer Directive needs a complete, playable implementation of the game defined in project-spec.md. The spec describes a turn-based colony expedition game with deterministic seeding, procedural events, planet generation, resource management, and a generated ending report. Currently only a prototype UI exists in the `example/` directory. This change delivers all game capabilities as individually testable, spec-aligned modules.

## What Changes

- Implement the full **Turn Loop** engine: upkeep consumption, loss condition checks, event generation, choice resolution, modifier application, and turn advancement.
- Implement all **12 Event Categories** with 2-4 choices each, resource costs/rewards, and optional modifiers.
- Implement **Planet Generation** with all 6 property axes (temperature, atmosphere, gravity, water, life, resources) and hazards; derive suitability score.
- Implement all **5 Starting Loadouts** with stat bonuses and event-probability modifiers.
- Implement the **Colonization Attempt** and **Ending Generation** pipeline: government, society, outcome, narrative, and final score.
- Implement the **Achievement System** for all 9 defined achievements.
- Implement the **Seed System**: reproducible runs from a numeric seed, custom seed entry, and seed sharing.
- Implement **Run History**: persist completed runs to LocalStorage, expose replay and statistics.
- Implement **Colony Name Generation**: procedural Descriptor + Noun + Planet format.
- Wire the complete **Gameplay Loop UI**: loadout selection → galaxy generation → turn loop → colonization → final report → history.

## Capabilities

### New Capabilities

- `turn-engine`: Core turn loop — consumes upkeep, checks loss conditions, generates/resolves events, applies modifiers, advances turn counter.
- `event-system`: All 12 event categories defined as data; each event has 2-4 choices with costs, rewards, optional modifiers, and optional chain links.
- `planet-generation`: Procedural planet attribute generation using seeded RNG; suitability score calculation from all 6 axes and hazards.
- `starting-loadouts`: 5 loadout definitions (Explorer, Industrial, Generation Ship, Military Escort, Research Vessel) with stat bonuses and probability weights.
- `colonization-ending`: Colonization attempt evaluation, colony outcome derivation (government + society + outcome), narrative generation, and expedition score calculation.
- `achievement-system`: 9 achievements with unlock conditions checked at runtime; persisted alongside run history.
- `seed-system`: Seeded PRNG driving all randomness; custom seed input, seed display, and seed-based run replay.
- `run-history`: LocalStorage persistence of completed run records and aggregate statistics; run replay from seed.
- `colony-name-generation`: Procedural colony name format: Descriptor + Noun + Planet.
- `gameplay-loop-ui`: SvelteKit UI wiring the complete player flow from start to final report using the architecture's unidirectional data-flow pattern.

### Modified Capabilities

_(none — this is greenfield implementation of the project spec)_

## Impact

- **Primary files**: `example/src/utils/gameEngine.ts`, `example/src/utils/rng.ts`, `example/src/data/gameContent.ts`, `example/src/types.ts`, all `example/src/components/*.tsx`, `example/src/App.tsx`.
- **Storage**: LocalStorage only — no backend, no database.
- **Dependencies**: No new npm packages beyond the existing stack (React, Tailwind, Vite, TypeScript).
- **No breaking changes** to the loop-engineering system or AGENTS.md.
