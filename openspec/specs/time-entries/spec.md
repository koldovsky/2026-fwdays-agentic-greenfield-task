# time-entries Specification

## Purpose
TBD - created by archiving change add-time-entries-core. Update Purpose after archive.
## Requirements
### Requirement: Start a running time entry

The system SHALL let a user start a time entry with a free-text description. Each user
SHALL have **at most one running entry** at any moment; the running entry is the single
source of truth for the tracking state. (FR-ENTRY-01, FR-ENTRY-11)

#### Scenario: Starting an entry with no timer running

- **WHEN** a user with no running entry starts a timer with a description
- **THEN** a new entry is created for that user with the given description, a start
  timestamp, and no stop time or duration
- **AND** it becomes the user's single running entry

#### Scenario: Description is required

- **WHEN** a start request omits the description or sends an empty/whitespace-only one
- **THEN** the request is rejected with a validation error and no entry is created

### Requirement: Stop the running entry

The system SHALL let a user stop their running entry. On stop, the duration SHALL be
computed as `stoppedAt − startedAt` and persisted; the entry SHALL no longer be running.
(FR-ENTRY-02)

#### Scenario: Stopping the running entry

- **WHEN** a user with a running entry stops the timer
- **THEN** the entry receives a stop timestamp and a persisted duration equal to
  `stoppedAt − startedAt` in whole seconds
- **AND** the user then has no running entry

#### Scenario: Stopping with no running entry

- **WHEN** a user with no running entry issues a stop
- **THEN** the request is rejected (or a no-op is reported) and no entry is modified

### Requirement: Starting a new entry stops the previous one

Starting a new entry while one is already running SHALL stop the previous entry first,
in a single atomic operation, so that no user ever has two overlapping running entries.
(FR-ENTRY-03, FR-ENTRY-11)

#### Scenario: Start while another entry runs

- **WHEN** a user with a running entry starts a new timer
- **THEN** the previously running entry is stopped (given a stop time and duration) and
  the new entry becomes the single running entry
- **AND** at no point are two of the user's entries running at once

#### Scenario: Server enforces the invariant regardless of surface

- **WHEN** two start requests for the same user are processed
- **THEN** the server guarantees the single-running-entry invariant itself, not relying
  on the client, so the app, widget, and Live Activity all observe one running entry

### Requirement: Add a manual entry

The system SHALL let a user add a completed entry by supplying an explicit start and end
time and a description. The end MUST be after the start; the duration SHALL be computed
from the supplied times. A manual entry SHALL NOT become the running entry.
(FR-ENTRY-04)

#### Scenario: Valid manual entry

- **WHEN** a user submits a description with a start time and a later end time
- **THEN** a completed entry is created with those times and a duration of
  `end − start`, and it is not running

#### Scenario: End not after start rejected

- **WHEN** a manual entry is submitted whose end time is equal to or before its start time
- **THEN** the request is rejected with a validation error and no entry is created

### Requirement: Edit an existing entry

The system SHALL let a user edit an entry's description, start time, and end time. When
the times change, the duration SHALL be recomputed. Edits MUST NOT create a second
running entry. (FR-ENTRY-05)

#### Scenario: Editing description and times

- **WHEN** a user updates an entry's description and/or start and end times
- **THEN** the entry reflects the new values and, if the times changed, a recomputed
  duration

#### Scenario: Editing cannot violate the single-running invariant

- **WHEN** an edit would leave a second entry running for the user
- **THEN** the request is rejected and the running state is unchanged

### Requirement: Delete an entry

The system SHALL let a user delete one of their entries. (FR-ENTRY-06)

#### Scenario: Deleting an entry

- **WHEN** a user deletes one of their entries
- **THEN** the entry no longer exists and is absent from the user's history

### Requirement: Continue a past entry

The system SHALL let a user "continue" a past entry: this SHALL start a new running entry
that copies the source entry's description **and its tags**, subject to the
single-running-entry invariant. The source entry SHALL be unchanged. (FR-ENTRY-08)

#### Scenario: Continue starts a fresh running entry

- **WHEN** a user continues a past entry
- **THEN** a new running entry is created with the same description as the source, and
  any previously running entry is stopped first
- **AND** the original entry is left unmodified

#### Scenario: Continue copies the source entry's tags

- **WHEN** a user continues a past entry that has one or more tags
- **THEN** the new running entry is assigned the same tags as the source

### Requirement: Entries are user-scoped and require authentication

Every time-entries endpoint SHALL require a valid access token and operate only on the
authenticated user's own entries. A user MUST never read or modify another user's
entries. (FR-ENTRY-11, BC-SCOPE-01, FR-AUTH-06)

#### Scenario: Unauthenticated request rejected

- **WHEN** a time-entries endpoint is called without a valid access token
- **THEN** the API responds with 401 Unauthorized

#### Scenario: Cross-user access denied

- **WHEN** a user requests or modifies an entry that belongs to another user
- **THEN** the request is denied (not found / forbidden) and no data is disclosed or changed

### Requirement: History is grouped by local calendar day

The system SHALL present history grouped by **local calendar day**, newest day first,
with a per-day total of tracked time. An entry that crosses midnight SHALL be attributed
to its **start day** for grouping and totals (MVP simplification). The grouping and
totals SHALL be a pure, framework-free function. (FR-ENTRY-07, FR-ENTRY-10, TC-PURE-01)

#### Scenario: Entries grouped newest-day-first with totals

- **WHEN** a user's entries are grouped for display in the device's local time zone
- **THEN** entries are bucketed by their local start date, days are ordered newest
  first, and each day shows the sum of its entries' durations

#### Scenario: Midnight-crossing entry counts on its start day

- **WHEN** an entry starts before local midnight and ends after it
- **THEN** the entire entry is attributed to its start day in both grouping and the
  day total

### Requirement: Duration formatting is a pure function

Duration formatting SHALL be provided by a pure, framework-free module, including an
`h:mm:ss` clock readout, and SHALL be fully unit-tested. No Nest, Prisma, or React
Native imports. (FR-ENTRY-09, TC-PURE-01, TC-TEST-01)

#### Scenario: Formats seconds as h:mm:ss

- **WHEN** a whole-second duration is formatted for the timer clock
- **THEN** the result is an `h:mm:ss` string (hours unpadded, minutes and seconds
  zero-padded to two digits)

#### Scenario: Guards non-finite and negative input

- **WHEN** a negative or non-finite value is formatted
- **THEN** it is treated as zero rather than throwing

### Requirement: Timer actions reflect optimistically and history stays smooth

Timer start/stop SHALL reflect in the UI optimistically in under 100 ms, with
persistence happening in the background and the UI reconciling on the server response.
The history list SHALL stay smooth (virtualized) with 1 000+ entries.
(NFR-PERF-01, NFR-PERF-02, TC-STACK-05)

#### Scenario: Optimistic start/stop

- **WHEN** a user taps start or stop
- **THEN** the UI updates immediately (under 100 ms) to the new tracking state before
  the server confirms, and reconciles to the server result when it arrives

#### Scenario: Failed persistence rolls back

- **WHEN** an optimistic timer action fails to persist on the server
- **THEN** the UI rolls back to the last server-confirmed state and surfaces a calm
  error rather than a wrong or stuck timer

#### Scenario: Large history remains responsive

- **WHEN** the history list holds 1 000+ entries
- **THEN** it renders and scrolls smoothly via virtualization rather than mounting all
  rows at once

