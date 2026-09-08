# timer-sessions Specification

## Purpose
TBD - created by archiving change add-timer-sessions. Update Purpose after archive.
## Requirements
### Requirement: Start a session timer (FR-TIMER-01)
The system SHALL start a session timer for a category the authenticated user owns, creating the
single `active_sessions` row in state `running` with `started_at = now`, and SHALL count elapsed time
up from zero.

#### Scenario: A timer starts for a chosen category
- **GIVEN** an authenticated user with no active session who owns category "Deep Work"
- **WHEN** the client POSTs `/api/timer/start` with that category
- **THEN** the system creates one `active_sessions` row owned by the user (`category_id` = "Deep Work", `started_at` = now, `state` = `running`), responds `201`, and elapsed time counts up from zero

#### Scenario: Starting on a category the user does not own is rejected
- **GIVEN** an authenticated user and a category owned by a different user
- **WHEN** the client POSTs `/api/timer/start` with that category id
- **THEN** the system responds `404` and creates no active session, because the user_id-scoped repository (FR-AUTH-07) never resolves another user's category

### Requirement: Pause and continue the timer (FR-TIMER-02)
The system SHALL pause a running timer by opening a pause segment (setting `state` = `paused` and
`pause_started_at` = now) and SHALL resume on continue by closing that segment (appending the closed
`(pause_started_at, now)` pair to `accumulated_pauses`, clearing `pause_started_at`, and setting
`state` = `running`), so that net time excludes the paused span.

#### Scenario: Pausing opens a pause segment
- **GIVEN** an authenticated user with a running active session
- **WHEN** the client POSTs `/api/timer/pause`
- **THEN** the system sets `state` = `paused` and `pause_started_at` = now, responds `200`, and the displayed timer freezes

#### Scenario: Continuing closes the pause segment
- **GIVEN** an authenticated user whose active session is paused with `pause_started_at` set
- **WHEN** the client POSTs `/api/timer/continue`
- **THEN** the system appends the `(pause_started_at, now)` pair to `accumulated_pauses`, clears `pause_started_at`, sets `state` = `running`, and responds `200`, so the closed span is excluded from net time

#### Scenario: An invalid pause/continue transition is rejected
- **GIVEN** an authenticated user with a running active session (not paused)
- **WHEN** the client POSTs `/api/timer/continue`
- **THEN** the system responds `409` and leaves the session unchanged, because continue is only valid from `paused` (and, symmetrically, pause only from `running`)

### Requirement: Stop and save the session (FR-TIMER-03)
The system SHALL stop the active timer and, via a save modal capturing optional notes and a final
category, persist the session **atomically** as one `sessions` row (`started_at` from the active
session, `ended_at` = now, the final category, notes, `source` = `timer`) plus one `pause_segments`
row per accumulated pause, and SHALL then delete the `active_sessions` row.

#### Scenario: Stopping persists the session and its pauses atomically
- **GIVEN** an authenticated user with a running active session that has two accumulated pauses
- **WHEN** the client POSTs `/api/timer/stop` with optional notes and a final category
- **THEN** the system writes one `sessions` row (`source` = `timer`) and two `pause_segments` rows in a single transaction, deletes the `active_sessions` row, and responds `201` with the saved session

#### Scenario: The final category may differ from the starting category
- **GIVEN** an active session started under category "Work"
- **WHEN** the client POSTs `/api/timer/stop` selecting final category "Study"
- **THEN** the saved `sessions` row records `category_id` = "Study", because the save modal's final category overrides the one the timer started with

#### Scenario: Stopping with no active session is rejected
- **GIVEN** an authenticated user with no active session
- **WHEN** the client POSTs `/api/timer/stop`
- **THEN** the system responds `404` and writes no session, because there is nothing to stop

### Requirement: Discard the active session with confirmation (FR-TIMER-04)
The system SHALL discard the active session only after an explicit confirmation, deleting the
`active_sessions` row **without persisting any `sessions` or `pause_segments` row**, and SHALL surface
the discard through the undo notification (FR-NOTIF-01) by writing the active-session before-image to
`undo_entries` and returning an undo token.

#### Scenario: A confirmed discard persists nothing and offers undo
- **GIVEN** an authenticated user with a running active session and an on-screen discard confirmation the user accepts
- **WHEN** the client POSTs `/api/timer/discard`
- **THEN** the system deletes the `active_sessions` row, writes its before-image (including `accumulated_pauses`) to `undo_entries`, responds with an undo token, and creates **no** `sessions` or `pause_segments` row

#### Scenario: A discarded session leaves no trace for later metrics or heatmap
- **GIVEN** a user who discarded an active session
- **WHEN** any later read of saved sessions runs
- **THEN** no `sessions` row exists for that discarded timer, so the metrics and heatmap slices (004+) can never attribute time to it (A-4)

#### Scenario: Discard requires an explicit confirmation before it fires
- **GIVEN** the Timer screen with a running timer
- **WHEN** the user triggers discard (the discard control or the Esc shortcut)
- **THEN** a confirmation dialog appears first and `POST /api/timer/discard` is issued only after the user confirms (A-8, DESIGN §7.2)

### Requirement: Timer keyboard shortcuts (FR-TIMER-05)
The system SHALL map keyboard shortcuts on the Timer screen to timer controls: Space starts or pauses
(context-dependent), S stops and saves, and Esc triggers the discard confirmation of FR-TIMER-04.

#### Scenario: Space is context-dependent
- **GIVEN** the Timer screen
- **WHEN** the user presses Space
- **THEN** the system starts the timer when idle, pauses it when running, and continues it when paused

#### Scenario: S stops and saves
- **GIVEN** a running or paused timer
- **WHEN** the user presses S
- **THEN** the system stops the timer and opens the save modal (notes + final category) of FR-TIMER-03

#### Scenario: Esc opens the discard confirmation
- **GIVEN** a running or paused timer
- **WHEN** the user presses Esc
- **THEN** the system opens the discard confirmation of FR-TIMER-04 rather than discarding immediately

### Requirement: A single server-authoritative active session per user (FR-TIMER-06)
The system SHALL keep at most one server-authoritative active (running or paused) session per user —
enforced by the `UNIQUE(user_id)` constraint on `active_sessions` — shared across the user's devices;
starting a new one SHALL be rejected until the current one is stopped or discarded.

#### Scenario: Starting a second active session is rejected
- **GIVEN** an authenticated user who already has an active session
- **WHEN** the client POSTs `/api/timer/start` again
- **THEN** the system responds `409` and creates no second `active_sessions` row (the `UNIQUE(user_id)` constraint); the user must stop or discard the current session first

#### Scenario: The active session is the same across the user's devices
- **GIVEN** an active session the user started on one device
- **WHEN** another of the user's devices reads or acts on the timer
- **THEN** it operates on the same single `active_sessions` row, because the server — not any device — is the source of truth (the live poll that pushes it to other devices is slice 007)

#### Scenario: A stale-version timer action is rejected
- **GIVEN** two of the user's devices each holding `version` N of the active session
- **WHEN** one device's action advances the row to `version` N+1 and the other device then POSTs a timer action carrying the stale `version` N
- **THEN** the system responds `409` and applies nothing, so the client must re-sync before retrying (optimistic concurrency, architecture §2.1)

### Requirement: A saved session records discrete pause segments (FR-SESS-01)
The system SHALL persist a saved session recording its `started_at`, `ended_at`, category, optional
notes, and each pause as a **discrete** `pause_segments` row (pauses are never merged), subject to the
integrity checks `ended_at > started_at` and every pause lying within its session.

#### Scenario: Two pauses are stored as two discrete segments
- **GIVEN** a session that was paused twice, for 5 minutes and then 10 minutes
- **WHEN** the session is persisted
- **THEN** the system writes one `sessions` row and **two** `pause_segments` rows with their exact `paused_at`/`resumed_at` boundaries, never a single merged 15-minute pause, so a later metrics slice can see two interruptions

#### Scenario: A session that violates its bounds is rejected
- **GIVEN** a request to persist a session whose `ended_at` is not after its `started_at`, or a pause that falls outside `[started_at, ended_at]`
- **WHEN** the write is attempted
- **THEN** the system rejects it (the `sessions` and `pause_segments` CHECK constraints), and persists nothing

### Requirement: Gross and net durations are derived per session (FR-SESS-02)
The system SHALL expose, for every saved session, a **gross** duration (`ended_at - started_at`) and a
**net** duration (gross minus the summed pause segments), both **derived at read time and never
stored** (architecture §2.2).

#### Scenario: Net excludes total paused time
- **GIVEN** a saved session of gross duration 60 minutes whose pause segments sum to 15 minutes
- **WHEN** the client reads the session
- **THEN** the response reports gross = 60 minutes and net = 45 minutes

#### Scenario: Net equals gross when there are no pauses
- **GIVEN** a saved session with no pause segments
- **WHEN** the client reads the session
- **THEN** net equals gross

#### Scenario: Editing a pause changes net with no stored total to desync
- **GIVEN** a saved session whose reported net reflects its current pause segments
- **WHEN** the client edits a pause's boundaries (FR-SESS-04)
- **THEN** the newly reported net is recomputed from the updated segments, because no net total is stored to fall out of sync

### Requirement: Manually add a past session (FR-SESS-03)
The system SHALL let the authenticated user add a past session with `started_at`, `ended_at`, a
category they own, optional notes, and optional pause segments — each pause supplied with its own
start and end via an add-pause control (A-6) — persisted as a `sessions` row with `source` = `manual`
plus its `pause_segments`.

#### Scenario: A manual session with pauses is added
- **GIVEN** an authenticated user who owns category "Reading"
- **WHEN** the client POSTs `/api/sessions` with a start, an end, that category, notes, and two pause segments
- **THEN** the system writes one `sessions` row (`source` = `manual`) and two `pause_segments` rows and responds `201`

#### Scenario: A manual session may have no pauses
- **GIVEN** an authenticated user who owns a category
- **WHEN** the client POSTs `/api/sessions` with a start, an end, and that category but no pauses
- **THEN** the system writes one `sessions` row with zero pause segments and responds `201`

#### Scenario: A manual session with invalid bounds or a foreign category is rejected
- **GIVEN** an authenticated user
- **WHEN** the client POSTs `/api/sessions` whose `ended_at` is not after `started_at`, or a pause outside the session, or a `category_id` owned by another user
- **THEN** the system rejects the request (`422` for a bounds violation, `404` for a category the user does not own, per FR-AUTH-07) and persists nothing

### Requirement: Edit a saved session, including its pauses (FR-SESS-04)
The system SHALL let the authenticated user edit one of their own sessions — its `started_at`,
`ended_at`, category, notes, and pause segments (add, adjust, or remove a pause) — and SHALL surface
the edit through the undo notification by writing the prior session and its pause segments to
`undo_entries` before applying the change and returning an undo token.

#### Scenario: Editing fields updates the session and offers undo
- **GIVEN** an authenticated user who owns a saved session
- **WHEN** the client PATCHes `/api/sessions/{id}` with a new start, end, category, and notes
- **THEN** the system captures the prior session and pause segments as a before-image in `undo_entries`, applies the update, and responds `200` with an undo token

#### Scenario: Editing the pause set adds, adjusts, and removes pauses
- **GIVEN** a saved session with two pause segments
- **WHEN** the client PATCHes it to add one pause, change another's boundaries, and remove one
- **THEN** the stored `pause_segments` match the edited set exactly and the reported net is recomputed from them

#### Scenario: Editing another user's session is rejected
- **GIVEN** a session owned by user A
- **WHEN** user B PATCHes `/api/sessions/{that id}`
- **THEN** the system responds `404` and changes nothing, because the user_id-scoped repository (FR-AUTH-07) never returns another user's row

### Requirement: Delete a saved session (FR-SESS-05)
The system SHALL let the authenticated user delete one of their own sessions — removing the
`sessions` row and its `pause_segments` (which cascade) — and SHALL surface the deletion through the
undo notification by writing the removed session and its pause segments to `undo_entries` and
returning an undo token.

#### Scenario: Deleting a session removes it and offers undo
- **GIVEN** an authenticated user who owns a saved session with pause segments
- **WHEN** the client DELETEs `/api/sessions/{id}`
- **THEN** the system removes the `sessions` row and its `pause_segments` (ON DELETE CASCADE), captures them as a before-image in `undo_entries`, and responds with an undo token

#### Scenario: Deleting another user's session is rejected
- **GIVEN** a session owned by user A
- **WHEN** user B DELETEs `/api/sessions/{that id}`
- **THEN** the system responds `404` and removes nothing, because the user_id-scoped repository (FR-AUTH-07) never returns another user's row

### Requirement: Present the session log (FR-SESS-06)
The system SHALL present a session log listing the authenticated user's saved sessions, scoped to
that user, each carrying its derived gross and net durations (FR-SESS-02); the in-progress active
session is not a saved session and does not appear in the log.

#### Scenario: The log lists the user's saved sessions with durations
- **GIVEN** an authenticated user with several saved sessions
- **WHEN** the client GETs `/api/sessions`
- **THEN** the response lists that user's saved sessions in a defined order, each with its gross and net duration

#### Scenario: The log is isolated per user
- **GIVEN** saved sessions for user A and user B
- **WHEN** user A GETs `/api/sessions`
- **THEN** the response contains only user A's sessions and never user B's (FR-AUTH-07)

#### Scenario: A running timer is not in the log
- **GIVEN** an authenticated user with one active (running) session and one saved session
- **WHEN** the client GETs `/api/sessions`
- **THEN** the response contains only the saved session, because the `active_sessions` row is not a saved session

### Requirement: Undo notification for discard, edit, and delete (FR-NOTIF-01)
After a session is discarded, edited, or deleted, the system SHALL surface a bottom-left notification
for 5 seconds offering an Undo control; the action SHALL be reversible until the token expires, after
which it is committed. Undo is implemented as an immediate server write plus a compensating restore
from the `undo_entries` before-image, with a single-use token valid 10 seconds server-side
(architecture §6). Undo-of-delete restores the removed row, undo-of-edit restores the prior values,
and undo-of-discard restores the unsaved active-timer state.

#### Scenario: Undo of a delete restores the session
- **GIVEN** a session the user just deleted, with a valid undo token
- **WHEN** the client POSTs `/api/undo/{token}` within the token's validity
- **THEN** the system re-inserts the `sessions` row and its `pause_segments` from the before-image, marks the token consumed, and responds `200`

#### Scenario: Undo of an edit restores the prior values
- **GIVEN** a session the user just edited, with a valid undo token
- **WHEN** the client POSTs `/api/undo/{token}` within the token's validity
- **THEN** the system reverts the session and its pause segments to the before-image and marks the token consumed

#### Scenario: Undo of a discard restores the unsaved active timer
- **GIVEN** a user who just discarded an active session, with a valid undo token, and who has no active session now
- **WHEN** the client POSTs `/api/undo/{token}` within the token's validity
- **THEN** the system re-inserts the `active_sessions` row (including its `accumulated_pauses`) from the before-image, restoring the running or paused timer, and marks the token consumed

#### Scenario: Undo of a discard conflicts when a new active session exists
- **GIVEN** a user who discarded an active session and has since started a new one
- **WHEN** the client POSTs `/api/undo/{token}` to un-discard
- **THEN** the system responds `409` with a clear conflict and restores nothing, because a user may hold at most one active session (FR-TIMER-06, architecture §6)

#### Scenario: An expired or already-used token commits the action
- **GIVEN** an undo token that has expired (past its 10-second server validity) or was already consumed
- **WHEN** the client POSTs `/api/undo/{token}`
- **THEN** the system rejects it and restores nothing, because the action has committed and the token is single-use

#### Scenario: The notification sits bottom-left for 5 seconds
- **GIVEN** a discard, edit, or delete just completed
- **WHEN** the notification renders
- **THEN** it appears bottom-left with an Undo button for 5 seconds and, on auto-dismiss, commits the action (DESIGN §8) — a position distinct from ordinary bottom-right toasts

