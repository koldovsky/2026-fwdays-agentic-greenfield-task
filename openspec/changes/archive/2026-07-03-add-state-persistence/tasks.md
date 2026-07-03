## 1. Versioned storage layer (FR-STATE-01, TC-STORAGE-01)

- [x] 1.1 Define the versioned key `prokhidnyi.v1` and the `PersistedState` shape (`scores`, `benefits`, `elective`, `fields`, `cities`, `saved`, `compare`) plus `SavedEntry` (status + priority) in `app/lib/storage.ts`
- [x] 1.2 Implement `hasStorage()` guarding `typeof window` and `window.localStorage`
- [x] 1.3 Implement `loadState` — return null when storage is absent, empty, unparseable, or not an object; otherwise the parsed partial state
- [x] 1.4 Implement `saveState` and `clearState` — no-op / swallow when storage is unavailable or throws (quota / private mode)

## 2. SSR-safe external store (FR-STATE-01)

- [x] 2.1 Define `DEFAULT_STATE` and a stable `SERVER_SNAPSHOT` (never mutated) in `app/lib/profileStore.ts`
- [x] 2.2 Implement `subscribe`, `getSnapshot`, and `getServerSnapshot` for `useSyncExternalStore`; hydrate from `localStorage` once on first subscription and merge stored scores/benefits over the defaults
- [x] 2.3 Implement `commit` — set current state, persist via `saveState`, and notify listeners

## 3. Mutations and status progression (FR-STATE-01)

- [x] 3.1 Implement `setScore` (clamped via `clampScore`), `setElective`, `toggleBenefit`, `toggleField`, `toggleCity`
- [x] 3.2 Implement `toggleSave` (add with default status Saved + next priority, or remove) and `toggleCompare` (add/remove, refusing beyond `MAX_COMPARE`)
- [x] 3.3 Implement the status stages `STATUSES`, `STATUS_MODIFIER`, and `nextStatus` (cyclic) in `app/lib/status.ts`; wire `advanceStatus` to no-op for unsaved programs
- [x] 3.4 Implement the `useProfile` hook in `app/hooks/useProfile.ts` exposing state, stable actions, and `isSaved`/`inCompare`

## 4. Tests

- [x] 4.1 Test `loadState` returns null for absent/empty/corrupt/non-object payloads and the parsed state for valid payloads
- [x] 4.2 Test `saveState`/`clearState` are non-fatal when `localStorage` throws, and that a round-trip restores the full profile shape
- [x] 4.3 Test store mutations persist + notify, `setScore` clamps, `toggleSave`/`toggleCompare` add/remove with the compare limit, and `advanceStatus` no-ops for unsaved programs
- [x] 4.4 Test `nextStatus` walks the five stages and wraps from Enrolled back to Saved
- [x] 4.5 Test `getServerSnapshot` returns the stable defaults so SSR and first client render match (no window access on the server)

## 5. Privacy verification (NFR-PRIV-01, BC-PRIVACY-01)

- [x] 5.1 Confirm no scores/benefits/profile fields are sent over the network and no third-party analytics touch sensitive data (grep for fetch/analytics in the state layer)

## 6. Validation and docs

- [x] 6.1 Run lint and the unit test suite; confirm all persistence tests pass
- [x] 6.2 Run `openspec validate add-state-persistence --strict` and confirm it passes
- [x] 6.3 Update `docs/current-state.md` with a state-persistence entry
