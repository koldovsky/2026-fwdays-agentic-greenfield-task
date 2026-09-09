## 3. Turn Engine

- [ ] 3.1 Implement `applyUpkeep(state: GameState): GameState` — subtracts per-turn costs from all resources, clamping at 0
- [ ] 3.2 Implement `checkLossConditions(state: GameState): LossReason | null` — returns the first resource at 0 (crew, fuel, morale) or null
- [ ] 3.3 Implement `selectEvent(state: GameState, rng: RNG): GameEvent` — picks a weighted random event using loadout probability modifiers
- [ ] 3.4 Implement `resolveChoice(state: GameState, choice: EventChoice): GameState` — applies cost, reward, and optional modifier atomically via the Reducer
- [ ] 3.5 Implement `applyModifiers(state: GameState): GameState` — applies each active modifier's effect and decrements duration; removes expired modifiers
- [ ] 3.6 Implement `advanceTurn(state: GameState): GameState` — increments turn counter
- [ ] 3.7 Implement the main `reducer(state: GameState, action: Action): GameState` that delegates to the above functions
- [ ] 3.8 Write unit tests for each turn engine function covering happy paths and edge cases (resource floor, modifier expiry, loss detection)