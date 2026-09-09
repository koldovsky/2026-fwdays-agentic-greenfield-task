## 1. Project Setup and Types

- [ ] 1.1 Audit `example/src/types.ts` and add any missing type fields required by the specs (e.g. RunRecord.loadoutName, GameState shape)
- [ ] 1.2 Define the canonical `GameState` interface in `types.ts` with all fields: resources, turn, seed, activeModifiers, discoveredPlanets, currentEvent, loadoutId, phase, runId
- [ ] 1.3 Define the `Action` union type covering all reducer action types (CHOOSE_EVENT_OPTION, START_COLONIZATION, ADVANCE_TURN, etc.)
- [ ] 1.4 Define the `GamePhase` enum: LOADOUT_SELECTION, TURN_LOOP, COLONIZATION, COLONY_REPORT, HISTORY