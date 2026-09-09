## Context

Pioneer Directive is a turn-based colony expedition game described in `project-spec.md`. Currently, only a basic SvelteKit/React UI prototype exists in the `example/` directory. The goal of this change is to fully implement the game logic and UI according to the spec, utilizing the unidirectional data flow architecture defined in `ARCHITECTURE.md`.

## Goals / Non-Goals

**Goals:**
- Implement all core game mechanics: resource management, planet generation, event system, and colonization endings.
- Wire the UI to the `GameState` using the Reducer pattern.
- Ensure all game states are deterministically driven by a numerical seed.
- Support saving and loading run history to LocalStorage.

**Non-Goals:**
- Implementing a backend or database (strictly LocalStorage).
- Adding complex graphical animations beyond simple CSS transitions.
- Multi-player or online features.

## Decisions

### D1: Unidirectional Data Flow
**Decision:** All UI interactions will dispatch actions to a central Reducer, which updates the `GameState`. The UI will exclusively read from this `GameState`.
**Rationale:** This ensures determinism, makes the game easy to test, and aligns with the defined `ARCHITECTURE.md`. It also guarantees that same seed + same actions = same outcome.

### D2: Seeded PRNG
**Decision:** Use a custom seeded PRNG (`rng.ts`) for all random generation (planets, events, names).
**Rationale:** The spec strictly requires reproducible runs based on a numeric seed. Native `Math.random()` cannot be seeded.

### D3: LocalStorage for Persistence
**Decision:** Store Run History and Achievements in LocalStorage.
**Rationale:** The game is local-first and requires no backend. LocalStorage provides sufficient capacity for run records and persistent achievement unlocks.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| State bloat in LocalStorage over many runs | Implement a cap on stored history records (e.g., max 100 runs) and prune the oldest entries. |
| UI performance with large event logs | The game is turn-based, so rendering updates are infrequent. Limit the history display to the final outcome rather than per-turn logs. |

## Migration Plan
Since this is a greenfield implementation over a basic prototype, there is no legacy data to migrate.

## Open Questions
- Should we add a detailed per-turn action log for debugging, or is the final colony report sufficient for now?
