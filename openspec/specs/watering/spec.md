# watering capability

## Purpose
This capability lets the Owner record, view, edit, and delete watering events for a plant so the watering history can be tracked over time. A watering event belongs to exactly one plant and captures a date-only event in the Owner's local calendar (Europe/Kiev) plus an optional free-text note. Watering dates are entered with a native date picker (`<input type="date">`), stored as ISO `YYYY-MM-DD`, and displayed to the Owner as `DD.MM.YYYY` (Ukrainian locale) — no free-text date parsing (SC-1, NFR-LOC-01). All interactive controls in this capability (watering form fields and the delete confirmation control) are keyboard-operable and have accessible labels (SC-6, NFR-A11Y-04). Recording a water amount (FR-WATER-06) and watering reminders (FR-WATER-07) are explicitly out of scope for MVP and intentionally unsupported. Charting of watering events is owned by a separate capability (FR-CHART-01/04) and is intentionally NOT specified or asserted here. No authorization checks apply: the system serves a single local Owner with no auth in MVP (NFR-SEC-01, TC-04, Q6), so unauthorized/forbidden paths are intentionally N/A for this capability.

## Requirements

### Requirement: Log a watering event
The system SHALL let the Owner log a watering event for a specific plant on a given date, with the date defaulting to today in the local calendar (FR-WATER-01). Per NFR-USA-03 the date is a date-only value in the Owner's local calendar (Europe/Kiev) with no time-of-day component. The date is entered with a native date picker (`<input type="date">`), stored as an ISO `YYYY-MM-DD` string, and displayed to the Owner as `DD.MM.YYYY` (Ukrainian locale) — there is no free-text date parsing (SC-1, NFR-LOC-01). The system SHALL reject any value that does not denote a real calendar date (e.g. 30 February) and SHALL reject any date after today in Europe/Kiev, since the Owner cannot water in the future (SC-2). Per NFR-PERF-01 the UI reflects the newly created event within 300 ms for a realistic dataset (<= 20 plants, <= 500 events total).

#### Scenario: Log a watering with the default date
- **WHEN** the Owner opens the watering form for an existing plant and submits without changing the pre-filled date
- **THEN** a watering event is created for that plant dated to today (local calendar, Europe/Kiev), and the UI reflects the new event within 300 ms

#### Scenario: Log a watering on an explicit past date
- **WHEN** the Owner picks a valid past calendar date with the native date picker and submits
- **THEN** the value is stored as an ISO `YYYY-MM-DD` date in the local calendar (Europe/Kiev) with no time-of-day stored, a watering event is created for that plant on that date, and the date is displayed back as `DD.MM.YYYY` (SC-1)

#### Scenario: Reject a missing date
- **WHEN** the Owner clears the date field and submits
- **THEN** the form surfaces a validation message inline next to the date field, no watering event is created, and no raw error or silent failure occurs

#### Scenario: Reject a value that is not a real calendar date
- **WHEN** the Owner submits a date value that does not denote a real calendar date (e.g. 30 February or a value the native date picker cannot represent)
- **THEN** the form surfaces a validation message inline next to the date field, no watering event is created, and no raw error or silent failure occurs

#### Scenario: Reject a future watering date
- **WHEN** the Owner submits a watering date after today in Europe/Kiev
- **THEN** the form surfaces a validation message inline next to the date field, no watering event is created, and no raw error or silent failure occurs, because a watering cannot be recorded in the future (SC-2, FR-SHELL-03)

#### Scenario: Reject logging against a non-existent plant
- **WHEN** a watering log is attempted for a plant id that does not exist
- **THEN** the operation is rejected with an inline error and no watering event is created

### Requirement: Optional watering note
The system SHALL let the Owner attach an optional free-text note to a watering event; the note may be left empty (FR-WATER-02). The note is bounded free text with a maximum length of 500 characters; the system SHALL reject a note longer than 500 characters with an inline validation error rather than truncating it or silently accepting it. A water amount is NOT captured in MVP (FR-WATER-06 is Future).

#### Scenario: Log a watering with a note
- **WHEN** the Owner enters free-text of 500 characters or fewer in the note field and submits
- **THEN** the created watering event stores the entered note text

#### Scenario: Log a watering without a note
- **WHEN** the Owner submits the watering form leaving the note empty
- **THEN** the watering event is created successfully with no note (the note is optional, not required)

#### Scenario: Reject a note that exceeds the maximum length
- **WHEN** the Owner enters a note longer than 500 characters and submits
- **THEN** the form surfaces a validation message inline next to the note field, no watering event is created or updated, the note is neither truncated nor silently accepted, and no raw error occurs

### Requirement: View a plant's watering events
The system SHALL let the Owner view the list of a plant's watering events ordered by date, most recent first (descending) (FR-WATER-03). Because dates are date-only values, two events on the SAME date SHALL be tie-broken deterministically by event id in descending order (the most recently created event of that day appears first) (SC-3). The list presents each event's date and note as readable values (no charting required to read them). Watering events persist across page reloads and app restarts (SC-4, NFR-DATA-01).

#### Scenario: View watering events ordered by date descending
- **WHEN** the Owner opens a plant that has watering events on distinct dates
- **THEN** the events are displayed as a list ordered by date descending (most recent date first), each showing its date and note (if any)

#### Scenario: Deterministic tie-break for same-date events
- **WHEN** the Owner opens a plant that has two or more watering events sharing the same date
- **THEN** those same-date events are ordered by event id descending (the more recently created event first), so the overall order is deterministic and reproducible

#### Scenario: Watering events persist across restart
- **WHEN** watering events have been logged for a plant and the app is reloaded or restarted
- **THEN** the previously logged watering events are still present in that plant's watering list (SC-4, NFR-DATA-01)

#### Scenario: Empty state when no watering events exist
- **WHEN** the Owner opens a plant that has no watering events
- **THEN** the watering list shows a clear empty state and no raw error

### Requirement: Edit a watering event
The system SHALL let the Owner edit an existing watering event's date and note (FR-WATER-04). Per NFR-USA-03 the edited date remains a date-only local-calendar value entered with the native date picker, stored as ISO `YYYY-MM-DD`, and displayed as `DD.MM.YYYY` (SC-1, NFR-LOC-01); it SHALL NOT be a date after today in Europe/Kiev (SC-2). Per NFR-PERF-01 the UI reflects the edit within 300 ms for a realistic dataset.

#### Scenario: Edit a watering event's date and note
- **WHEN** the Owner changes the date and/or note of an existing watering event to valid values and saves
- **THEN** the watering event is updated with the new date-only value and note, and the plant's watering list reflects the change within 300 ms

#### Scenario: Reject an invalid or future date on edit
- **WHEN** the Owner clears the date, enters a value that does not denote a real calendar date (e.g. 30 February), or sets a date after today in Europe/Kiev while editing and saves
- **THEN** the form surfaces a validation message inline next to the date field, the original event is unchanged, and no raw error occurs (SC-1, SC-2)

#### Scenario: Reject editing a non-existent or already-deleted watering event
- **WHEN** an edit is attempted against a watering-event id that does not exist or that refers to an event that has already been deleted
- **THEN** the operation is rejected with an inline error, no event is created or modified, and no raw error or silent failure occurs

### Requirement: Delete a watering event
The system SHALL let the Owner delete a watering event, requiring an explicit confirmation step before the deletion takes effect (FR-WATER-05). The delete SHALL affect only that single watering-event row — it does NOT cascade to the parent plant, to other watering events, or to measurements (only plant deletion cascades, per FR-PLANT-07) (SC-5, NFR-DATA-02).

#### Scenario: Delete with confirmation affects only that row
- **WHEN** the Owner requests deletion of a watering event and confirms in the confirmation step
- **THEN** that single watering event is removed from the plant's watering list, while the parent plant, its other watering events, and its measurements are all left unchanged (SC-5, NFR-DATA-02)

#### Scenario: Cancel deletion
- **WHEN** the Owner requests deletion of a watering event but cancels at the confirmation step
- **THEN** the watering event is retained unchanged

#### Scenario: Reject deleting a non-existent or already-deleted watering event
- **WHEN** deletion is attempted against a watering-event id that does not exist or that refers to an event that has already been deleted
- **THEN** the operation is rejected with an inline error, no further state change occurs, and no raw error or silent failure occurs
