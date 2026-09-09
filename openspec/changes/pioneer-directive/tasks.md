## 1. Project Setup and Types

- [ ] 1.1 Audit `example/src/types.ts` and add any missing type fields required by the specs (e.g. RunRecord.loadoutName, GameState shape)
- [ ] 1.2 Define the canonical `GameState` interface in `types.ts` with all fields: resources, turn, seed, activeModifiers, discoveredPlanets, currentEvent, loadoutId, phase, runId
- [ ] 1.3 Define the `Action` union type covering all reducer action types (CHOOSE_EVENT_OPTION, START_COLONIZATION, ADVANCE_TURN, etc.)
- [ ] 1.4 Define the `GamePhase` enum: LOADOUT_SELECTION, TURN_LOOP, COLONIZATION, COLONY_REPORT, HISTORY

## 2. Seeded RNG

- [ ] 2.1 Verify `example/src/utils/rng.ts` implements a fully seeded PRNG with `next()`, `range()`, `choice()`, and `sample()` methods
- [ ] 2.2 Add `RNG.seed` getter so the active seed is always accessible from the RNG instance
- [ ] 2.3 Write unit tests for RNG: same seed produces same sequence; range is inclusive; sample has no duplicates

## 3. Turn Engine

- [ ] 3.1 Implement `applyUpkeep(state: GameState): GameState` — subtracts per-turn costs from all resources, clamping at 0
- [ ] 3.2 Implement `checkLossConditions(state: GameState): LossReason | null` — returns the first resource at 0 (crew, fuel, morale) or null
- [ ] 3.3 Implement `selectEvent(state: GameState, rng: RNG): GameEvent` — picks a weighted random event using loadout probability modifiers
- [ ] 3.4 Implement `resolveChoice(state: GameState, choice: EventChoice): GameState` — applies cost, reward, and optional modifier atomically via the Reducer
- [ ] 3.5 Implement `applyModifiers(state: GameState): GameState` — applies each active modifier's effect and decrements duration; removes expired modifiers
- [ ] 3.6 Implement `advanceTurn(state: GameState): GameState` — increments turn counter
- [ ] 3.7 Implement the main `reducer(state: GameState, action: Action): GameState` that delegates to the above functions
- [ ] 3.8 Write unit tests for each turn engine function covering happy paths and edge cases (resource floor, modifier expiry, loss detection)

## 4. Event System

- [ ] 4.1 Expand `example/src/data/gameContent.ts` to contain at least 2 events per category (24 events total across 12 categories)
- [ ] 4.2 Ensure every event has 2-4 choices; add a choice requirement field for any resource-gated choice
- [ ] 4.3 Add at least 2 chain events (choices with nextEventId) spanning different categories
- [ ] 4.4 Define per-loadout category weight maps and wire them into `selectEvent()`
- [ ] 4.5 Write unit tests: all events have 2-4 choices; all referenced nextEventIds resolve to existing events

## 5. Planet Generation

- [ ] 5.1 Verify `generatePlanet()` in `gameEngine.ts` covers all 6 axes and 0-3 hazards from the hazard pool
- [ ] 5.2 Verify `calculateSuitability()` matches spec weighting (Temperature 25, Atmosphere 30, Gravity 15, Water 15, Life 10, Resources 5, -10 per hazard, clamped 5-100)
- [ ] 5.3 Verify `generatePlanetName()` produces names matching the Prefix-Number[Letter] or Prefix Number pattern
- [ ] 5.4 Write unit tests: perfect planet scores 100; each hazard reduces score by 10; same seed produces same planet

## 6. Starting Loadouts

- [ ] 6.1 Define all 5 loadout objects in `gameContent.ts`: Explorer, Industrial, Generation Ship, Military Escort, Research Vessel — each with bonusResources, trait, traitDescription, and categoryWeights
- [ ] 6.2 Implement `applyLoadoutBonus(baseResources: Resources, loadout: StartingLoadout): Resources`
- [ ] 6.3 Implement `LoadoutSelection` component showing all 5 cards with name, description, stat deltas, and trait badge
- [ ] 6.4 Write unit test: each loadout's bonus resources match the spec deltas (Explorer +Science, Industrial +Industry +Fuel, etc.)

## 7. Colonization and Ending

- [ ] 7.1 Implement colonization eligibility check: suitability >= 20 required; expose `canColonize(planet: Planet): boolean`
- [ ] 7.2 Verify `generateColonyOutcome()` covers all government/society/outcome branches per spec section 9
- [ ] 7.3 Verify `generateColonyName()` uses Descriptor + Noun + PlanetName format with lists of >= 10 items each
- [ ] 7.4 Verify `calculateExpeditionScore()` uses the spec formula (base 2000 + suitability*50 + resources + turn bonus)
- [ ] 7.5 Implement `ColonyReportView` component: planet name, colony name, government, society, outcome, score, seed, and narrative text
- [ ] 7.6 Write unit tests: Legendary outcome conditions; score decreases with more turns; government branches match spec

## 8. Achievement System

- [ ] 8.1 Confirm all 9 achievements are defined in `INITIAL_ACHIEVEMENTS` with correct ids, names, descriptions, icons
- [ ] 8.2 Add "Archivist" achievement (discover every event category) to the achievement list and unlock logic in `checkAchievements()`
- [ ] 8.3 Implement unlock persistence: save/load unlocked achievement IDs to LocalStorage key `pioneer_achievements`
- [ ] 8.4 Implement achievement unlock toast notification component (non-blocking, auto-dismisses after 3 seconds)
- [ ] 8.5 Write unit tests for each of the 9 unlock conditions in `checkAchievements()`

## 9. Seed System

- [ ] 9.1 Implement `generateRandomSeed(): number` — produces a random integer in the range [100000, 999999]
- [ ] 9.2 Add seed display to the game header during active runs
- [ ] 9.3 Implement custom seed input on the new-game / loadout selection screen
- [ ] 9.4 Ensure colony report screen prominently displays the run seed with a copy-to-clipboard button
- [ ] 9.5 Write unit test: same seed + same choices = same event sequence for first 10 turns

## 10. Run History

- [ ] 10.1 Implement `saveRunRecord(record: RunRecord): void` — appends to LocalStorage key `pioneer_history` (max 100 records, prune oldest)
- [ ] 10.2 Implement `loadRunHistory(): RunRecord[]` — reads and parses from LocalStorage; returns empty array if missing/corrupt
- [ ] 10.3 Implement `computeStats(history: RunRecord[]): GameStats` — derives all 7 aggregate statistics
- [ ] 10.4 Implement `HistoryScreen` component: list of past runs (date, planet, outcome, score) and aggregate stats panel
- [ ] 10.5 Implement Replay button in HistoryScreen: starts a new run pre-populated with the stored seed
- [ ] 10.6 Write unit tests for `computeStats()`: bestScore, averageScore, fastestVictory edge cases

## 11. UI Wiring and Layout

- [ ] 11.1 Implement the four-region layout in `App.tsx`: Header, Center (event card), Sidebar (resources + active modifiers), Footer (action buttons)
- [ ] 11.2 Wire the phase machine in `App.tsx`: LOADOUT_SELECTION -> TURN_LOOP -> COLONIZATION -> COLONY_REPORT -> (back to LOADOUT_SELECTION or HISTORY)
- [ ] 11.3 Implement `DashboardHeader` showing: ship name, turn counter, active seed, hull integrity bar
- [ ] 11.4 Implement `ResourcePanel` showing all 9 resources with icons and change-delta indicators
- [ ] 11.5 Implement `EventCardView` showing event title, category badge, description, and 2-4 choice buttons (locked choices styled differently)
- [ ] 11.6 Implement `PlanetScannerView` showing discovered planets with suitability score and colonize button (disabled if suitability < 20)
- [ ] 11.7 Ensure the app works fully offline: no external CDN fetches; all fonts and assets bundled
- [ ] 11.8 Verify dark space-terminal color palette: no white/light backgrounds in game screens; primary accent colors are Cyan and Amber

## 12. Integration and End-to-End Validation

- [ ] 12.1 Play a full run from loadout selection to colony report and verify all screens render without errors
- [ ] 12.2 Replay the same seed twice and verify all events, planet, and colony name match
- [ ] 12.3 Reach turn 50 and verify "One More Turn" achievement unlocks with a toast
- [ ] 12.4 Allow Crew to reach 0 and verify defeat screen appears instead of a new event
- [ ] 12.5 Save 3 runs and open History screen; verify all stats (totalRuns=3, bestScore, etc.) are correct
- [ ] 12.6 Run `npm run lint` in `example/` and verify zero TypeScript errors
- [ ] 12.7 Run `openspec validate pioneer-directive` and verify all artifacts pass
