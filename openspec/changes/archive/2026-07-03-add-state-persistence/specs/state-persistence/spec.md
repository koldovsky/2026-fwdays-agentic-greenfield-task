## ADDED Requirements

### Requirement: Persist profile state across sessions
The system SHALL persist the applicant's full profile — subject scores, benefit
toggles, chosen elective, field and city filters, the saved shortlist (each entry's
application status and priority), and the compare list — so that it survives a full
page reload and browser restart on the same device. Persistence SHALL use a
versioned storage key so a future breaking shape change can be isolated. (Traces:
FR-STATE-01.)

#### Scenario: State survives a reload
- **WHEN** the applicant sets scores, toggles benefits, picks filters, saves programs, and advances statuses, then reloads the page
- **THEN** all of that state is restored exactly as left

#### Scenario: Full profile shape is persisted
- **WHEN** the profile is written to storage
- **THEN** the persisted payload includes `scores`, `benefits`, `elective`, `fields`, `cities`, `saved` (status + priority per program), and `compare`

#### Scenario: Versioned storage key
- **WHEN** the profile is persisted
- **THEN** it is stored under a versioned key (e.g. `prokhidnyi.v1`) so a future incompatible shape can bump the version without reading stale data

### Requirement: SSR-safe reads without hydration mismatch
The system SHALL read persisted state in an SSR-safe way: it SHALL NOT touch
`window`/`localStorage` on the server, and it SHALL provide a stable server snapshot
(the defaults) so the server render and the first client render match. It SHALL
hydrate from `localStorage` after the first client subscription and re-render with
the stored profile, using `useSyncExternalStore` (no setState-in-effect). (Traces:
FR-STATE-01, TC-STORAGE-01.)

#### Scenario: No window access on the server
- **WHEN** the profile is read during server rendering
- **THEN** no `window` or `localStorage` access occurs and the server snapshot (defaults) is returned

#### Scenario: First client render matches the server
- **WHEN** the client renders for the first time
- **THEN** it uses the same default snapshot the server used, so there is no hydration mismatch
- **AND** after hydration the store loads the stored profile and re-renders with it

### Requirement: Fresh-start fallback on absent or corrupt storage
The system SHALL treat absent, empty, or unparseable storage as "no saved state"
and fall back to fresh defaults rather than crashing. Writes SHALL be non-fatal:
when storage is unavailable (quota exceeded, private mode), the app SHALL keep
working in-memory. (Traces: FR-STATE-01, TC-STORAGE-01.)

#### Scenario: No stored state yields defaults
- **WHEN** there is no persisted payload under the storage key
- **THEN** `loadState` returns null and the app starts from the default profile

#### Scenario: Corrupt payload does not crash
- **WHEN** the stored payload is not valid JSON or not an object
- **THEN** loading returns null (fresh-start fallback) instead of throwing

#### Scenario: Write failures are non-fatal
- **WHEN** a write to `localStorage` throws (quota exceeded or private mode)
- **THEN** the failure is swallowed and the app continues to work with in-memory state

### Requirement: On-device only, no backend, no analytics on sensitive data
The system SHALL keep all profile state on the user's device via `localStorage` with
no backend and no cross-device sync in the MVP. It SHALL NOT send scores, benefits,
or any sensitive profile field to a server or third-party analytics, and SHALL
collect no more than the state needed to power the app. (Traces: TC-STORAGE-01,
NFR-PRIV-01, BC-PRIVACY-01.)

#### Scenario: No data leaves the device
- **WHEN** the profile is created, mutated, or persisted
- **THEN** no network request carries scores, benefits, or any profile field off the device

#### Scenario: No analytics on sensitive fields
- **WHEN** score or benefit data changes
- **THEN** no third-party analytics call is made with that data

### Requirement: Application-status progression
The system SHALL model an application's status as an ordered progression — Saved →
Submitted → Under review → Recommended → Enrolled — and SHALL advance a saved
program to the next stage on request, cycling from the last stage back to the first.
Advancing SHALL be a no-op for a program that is not saved. (Traces: FR-STATE-01.)

#### Scenario: Advance to the next stage
- **WHEN** a saved program's status is advanced
- **THEN** it moves to the next stage in the order Saved → Submitted → Under review → Recommended → Enrolled

#### Scenario: Cycle from the last stage
- **WHEN** a program at the final stage (Enrolled) is advanced
- **THEN** its status wraps back to the first stage (Saved)

#### Scenario: Advancing an unsaved program is a no-op
- **WHEN** a status advance is requested for a program that is not in the saved list
- **THEN** nothing changes and no entry is created

### Requirement: Profile hook with stable actions
The system SHALL expose a `useProfile` hook returning the current profile plus
module-stable action handlers (`setScore`, `setElective`, `toggleBenefit`,
`toggleField`, `toggleCity`, `toggleSave`, `toggleCompare`, `advanceStatus`) and
read helpers (`isSaved`, `inCompare`). Each mutation SHALL persist and notify
subscribers, and score mutations SHALL be clamped to the valid range. (Traces:
FR-STATE-01.)

#### Scenario: Mutations persist and re-render
- **WHEN** any action handler mutates the profile
- **THEN** the new state is persisted to storage and every subscribed component re-renders with it

#### Scenario: Toggling save and compare
- **WHEN** `toggleSave` is called for a program
- **THEN** it is added to the saved list (default status Saved, next priority) or removed if already saved
- **AND** `toggleCompare` adds/removes it from the compare list, refusing to add beyond the compare limit

#### Scenario: Score input is clamped on write
- **WHEN** `setScore` is called with an out-of-range value
- **THEN** the stored score is clamped to the valid 100–200 range
