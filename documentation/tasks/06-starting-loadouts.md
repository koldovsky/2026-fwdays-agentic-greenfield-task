## 6. Starting Loadouts

- [ ] 6.1 Define all 5 loadout objects in `gameContent.ts`: Explorer, Industrial, Generation Ship, Military Escort, Research Vessel — each with bonusResources, trait, traitDescription, and categoryWeights
- [ ] 6.2 Implement `applyLoadoutBonus(baseResources: Resources, loadout: StartingLoadout): Resources`
- [ ] 6.3 Implement `LoadoutSelection` component showing all 5 cards with name, description, stat deltas, and trait badge
- [ ] 6.4 Write unit test: each loadout's bonus resources match the spec deltas (Explorer +Science, Industrial +Industry +Fuel, etc.)