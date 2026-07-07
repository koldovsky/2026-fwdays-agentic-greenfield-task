## ADDED Requirements

### Requirement: Decoupled binge-free day and success story actions
The system SHALL provide two independent progress-logging actions — a daily binge-free check-in and a success story entry — that function as fully separate user-initiated flows with no implicit coupling between them.

#### Scenario: Check-in does not create a success story
- **WHEN** the user submits the daily binge-free check-in
- **THEN** no success story entry is created automatically

#### Scenario: Success story does not log a binge-free day
- **WHEN** the user submits a success story entry
- **THEN** the binge-free check-in state and streak counter are not modified

---

### Requirement: Daily binge-free check-in (one per calendar day)
The system SHALL allow a user to log exactly one binge-free day per calendar day via an explicit check-in action. Submitting the check-in SHALL increment both the user's current streak counter and their lifetime binge-free day count.

#### Scenario: First check-in of the day succeeds
- **WHEN** the user activates the check-in action and has not yet checked in today
- **THEN** a `BingeFreeLog` entry is created for today's date, the current streak is incremented by 1, and the lifetime count is incremented by 1

#### Scenario: Second check-in on the same calendar day is rejected
- **WHEN** the user activates the check-in action and has already checked in today
- **THEN** the check-in action is disabled (or an informational message is shown) and no duplicate entry is created

#### Scenario: Optimistic UI on check-in
- **WHEN** the user submits the check-in while online
- **THEN** the streak and lifetime counters update immediately in the UI before the server confirms

#### Scenario: Check-in queued when offline
- **WHEN** the user submits the check-in while offline
- **THEN** the action is queued locally; the UI reflects the updated counters; the entry syncs to the server when connectivity is restored

---

### Requirement: Streak reset on missed day
The system SHALL reset the current streak to 1 (counting today) when the user checks in but has no entry for the immediately preceding calendar day.

#### Scenario: Streak resets after a missed day
- **WHEN** the user checks in today and the most recent prior `BingeFreeLog` entry is two or more days ago
- **THEN** `currentStreak` is set to 1 (today only) after the check-in completes

#### Scenario: Streak continues on consecutive days
- **WHEN** the user checks in today and there is a `BingeFreeLog` entry for yesterday
- **THEN** `currentStreak` increments by 1 from its previous value

---

### Requirement: Streak and lifetime counter state accessible to dashboard
The system SHALL expose `currentStreak`, `lifetimeDays`, and `todayCheckedIn` via a Zustand slice so that the `dashboard` capability can render these values without owning the underlying data logic.

#### Scenario: Dashboard reads counters without fetching independently
- **WHEN** the dashboard renders after successful progress-logging hydration
- **THEN** `currentStreak` and `lifetimeDays` are available in the shared Zustand slice and the dashboard renders them without issuing its own database query

#### Scenario: Counters available on first render from persisted state
- **WHEN** the application loads and TanStack Query has not yet resolved the server fetch
- **THEN** the Zustand slice returns the last-known persisted values so counters do not flash 0 on load

---

### Requirement: Success story entry flow (multiple per day)
The system SHALL allow a user to submit one or more narrative success story entries per calendar day. Each entry is stored independently and is not coupled to the daily check-in.

#### Scenario: First story of the day succeeds
- **WHEN** the user submits a non-empty success story text
- **THEN** a `SuccessStory` entry is created with the user's content and a timestamp; the entry appears in the user's stories list

#### Scenario: Multiple stories on the same day
- **WHEN** the user submits a second success story on a day where one already exists
- **THEN** both entries are stored independently; no uniqueness constraint prevents submission

#### Scenario: Empty story submission is rejected
- **WHEN** the user attempts to submit a success story with an empty or whitespace-only text field
- **THEN** the submission is blocked at the client and no entry is created

#### Scenario: Story entry queued when offline
- **WHEN** the user submits a success story while offline
- **THEN** the entry is queued locally and syncs to the server when connectivity is restored

---

### Requirement: Tone-aware copy for all progress-logging UI
All user-facing text in the progress-logging UI (check-in button label, success story prompt, confirmation messages, streak display strings) SHALL reflect the active Tone Mode (`calm`, `rational`, `auntie`) from the tone-engine.

#### Scenario: Calm mode uses non-judgmental language
- **WHEN** the active Tone Mode is `calm`
- **THEN** all progress-logging copy uses soft, non-judgmental language with no exclamation marks

#### Scenario: Auntie mode uses high-impact language
- **WHEN** the active Tone Mode is `auntie`
- **THEN** progress-logging copy uses fierce, dramatic language and may include exclamation marks

#### Scenario: Rational mode uses data-driven language
- **WHEN** the active Tone Mode is `rational`
- **THEN** progress-logging copy uses logical, analytical vocabulary

---

### Requirement: Offline-first data resilience for progress logs
Progress-logging mutations (check-in and story submission) SHALL be locally queued and reflected in the UI immediately, with background sync to Supabase when connectivity is restored, satisfying NFR-OFFLINE-01.

#### Scenario: Check-in visible offline before sync
- **WHEN** the user checks in while offline
- **THEN** the updated streak and lifetime counters are visible immediately in the UI

#### Scenario: Sync completes on reconnection
- **WHEN** the device reconnects after one or more offline mutations
- **THEN** all queued check-ins and story entries are persisted to Supabase without user intervention
