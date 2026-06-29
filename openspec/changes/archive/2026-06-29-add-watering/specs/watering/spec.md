## ADDED Requirements

### Requirement: Log a watering event
The system SHALL let the Owner log a watering event for a specific plant on a given calendar date, where the date defaults to today in the Owner's local calendar (Europe/Kiev) per FR-WATER-01 and NFR-USA-03. The date is entered with a native date picker (`<input type="date">`), stored as ISO `YYYY-MM-DD`, and displayed as `DD.MM.YYYY` (SC-1); a value that is not a real calendar date and any date after today in Europe/Kiev are rejected (SC-2). Each watering event SHALL belong to exactly one plant via a foreign key to `plants.id` declared `ON DELETE CASCADE` (deleting the plant removes its watering events; SC-5). A water amount is NOT captured (FR-WATER-06 is Future). Per NFR-PERF-01 the UI reflects the change within 300 ms for a realistic dataset (<= 20 plants, <= 500 events total).

#### Scenario: Log with the default date
- **WHEN** the Owner opens the watering form for an existing plant and submits without changing the pre-filled date and without a note
- **THEN** a watering event is created for that plant dated to today in the Europe/Kiev local calendar with no time-of-day and no note, and the UI reflects the new event within 300 ms (FR-WATER-01, NFR-USA-03, NFR-PERF-01)

#### Scenario: Log on an explicit past date
- **WHEN** the Owner picks a valid past calendar date with the native date picker and submits
- **THEN** the value is stored as an ISO `YYYY-MM-DD` date in the local calendar (Europe/Kiev) with no time-of-day stored, a watering event is created for that plant on that date, and the date is displayed back as `DD.MM.YYYY` (FR-WATER-01, SC-1)

#### Scenario: Missing date defaults to today
- **WHEN** the Owner clears (or never fills) the date field and submits
- **THEN** the watering date defaults to today in the Owner's local calendar (Europe/Kiev), the watering event is created on that date, and no inline error, raw 500, or silent failure occurs — the date is required but a blank submission resolves to today rather than being rejected (FR-WATER-01, NFR-USA-03, SC-1)

#### Scenario: Reject a value that is not a real calendar date
- **WHEN** the Owner submits a date value that does not denote a real calendar date (e.g. "2026-13-40", "2026-02-30", or "not-a-date")
- **THEN** an inline validation error is shown next to the date field, no watering event is created, and no raw 500 or silent failure occurs (SC-1, FR-SHELL-03)

#### Scenario: Reject a future watering date
- **WHEN** the Owner submits a watering date after today in Europe/Kiev
- **THEN** an inline validation error is shown next to the date field, no watering event is created, and no raw 500 or silent failure occurs, because a watering cannot be recorded in the future (SC-2, FR-SHELL-03)

#### Scenario: Log against a non-existent plant
- **WHEN** the Owner attempts to log a watering for a plant id that does not exist
- **THEN** the request is rejected with a not-found result and no watering event is created (no raw 500, no silent failure) (NFR-DATA-02)

### Requirement: Optional watering note
The system SHALL let the Owner attach an OPTIONAL free-text note to a watering event per FR-WATER-02; the note may be left empty. The note is trimmed before storage; an empty or whitespace-only note is stored as no note (SQL `NULL`), not an empty string. The note is bounded to a maximum of 500 characters (measured after trimming); a note longer than 500 characters SHALL be rejected with an inline validation error rather than truncated or silently accepted. A water amount is NOT captured in MVP (FR-WATER-06 is Future).

#### Scenario: Log a watering with a note
- **WHEN** the Owner enters free-text of 500 characters or fewer in the note field and submits
- **THEN** the created watering event stores the entered note text (FR-WATER-02)

#### Scenario: Log a watering without a note
- **WHEN** the Owner submits the watering form leaving the note empty or whitespace-only
- **THEN** the watering event is created successfully with no note stored as `NULL` (the note is optional, not required, and an empty submission is not persisted as an empty string) (FR-WATER-02)

#### Scenario: Reject a note that exceeds the maximum length
- **WHEN** the Owner enters a note longer than 500 characters (after trimming) and submits
- **THEN** an inline validation error is shown next to the note field, no watering event is created or updated, the note is neither truncated nor silently accepted, and no raw 500 occurs (FR-WATER-02, FR-SHELL-03)

### Requirement: View a plant's watering events
The system SHALL let the Owner view the list of a plant's watering events ordered by date descending (most recent first) per FR-WATER-03. Because watering events are date-only, two events on the SAME date SHALL be tie-broken deterministically by row id in descending order (the most recently created event of that day appears first) per SC-3. The list SHALL present the underlying values (date and note), not only a chart (NFR-A11Y-03). Watering events persist across page reloads and app restarts (SC-4, NFR-DATA-01).

#### Scenario: List ordered by date descending
- **WHEN** the Owner opens a plant that has watering events on distinct dates
- **THEN** the events are displayed as a list ordered by date descending (most recent date first), each row showing the watering date as `DD.MM.YYYY` and its note (if any) (FR-WATER-03, SC-1, SC-3)

#### Scenario: Deterministic tie-break for same-date events
- **WHEN** the Owner opens a plant that has two or more watering events sharing the same date
- **THEN** those same-date events are ordered by row id descending (the more recently created event first), so the overall order is deterministic and reproducible (SC-3)

#### Scenario: Watering events persist across restart
- **WHEN** watering events have been logged for a plant and the app is reloaded or restarted
- **THEN** the previously logged watering events are still present in that plant's watering list (SC-4, NFR-DATA-01)

#### Scenario: Empty state
- **WHEN** the Owner opens a plant that has no watering events
- **THEN** the waterings section shows a clear empty state instead of an error or a blank area (FR-WATER-03)

#### Scenario: View a non-existent plant
- **WHEN** the Owner opens a plant id that does not exist
- **THEN** a not-found result is shown instead of waterings and no raw 500 or blank area is rendered (NFR-DATA-02)

### Requirement: Edit a watering event
The system SHALL let the Owner edit an existing watering event's date and note per FR-WATER-04. Edits SHALL re-apply the same date validation (SC-1, SC-2) and optional-note rule as logging, and SHALL be all-or-nothing: a rejected edit leaves the original watering event unchanged (NFR-DATA-02). Per NFR-PERF-01 the UI reflects the edit within 300 ms for a realistic dataset.

#### Scenario: Edit date and note
- **WHEN** the Owner changes the date and/or note of an existing watering event to valid values and saves
- **THEN** the watering event is updated with the new date-only value and note, and the plant's watering list reflects the change within 300 ms (FR-WATER-04, NFR-PERF-01)

#### Scenario: Clear the note on edit
- **WHEN** the Owner clears the note of an existing watering event and saves
- **THEN** the watering event is updated to have no note (stored as `NULL`), the rest of the event unchanged (FR-WATER-04, FR-WATER-02)

#### Scenario: Reject an invalid or future date on edit
- **WHEN** the Owner enters a value that does not denote a real calendar date (e.g. "2026-02-30"), or sets a date after today in Europe/Kiev while editing and saves
- **THEN** an inline validation error is shown next to the date field, the original event is left unchanged, and no raw 500 occurs (SC-1, SC-2, NFR-DATA-02)
- **AND** a cleared/blank date defaults to today in Europe/Kiev (the same default-to-today rule as logging, FR-WATER-01) rather than being rejected

#### Scenario: Reject an over-length note on edit
- **WHEN** the Owner edits a watering event's note to more than 500 characters and saves
- **THEN** an inline validation error is shown next to the note field and the original event is left unchanged (FR-WATER-02, NFR-DATA-02)

#### Scenario: Edit a non-existent watering event
- **WHEN** the Owner attempts to edit a watering-event id that does not exist (e.g. one deleted in another tab)
- **THEN** the request is rejected with a not-found result and no event is created or modified (no raw 500, no silent failure) (NFR-DATA-02)

### Requirement: Delete a watering event
The system SHALL let the Owner delete a watering event, with an explicit confirmation step, per FR-WATER-05. The delete SHALL affect only that single watering-event row — it does NOT cascade to the parent plant, to other watering events, or to growth measurements (only plant deletion cascades, per FR-PLANT-07) (SC-5, NFR-DATA-02).

#### Scenario: Delete after confirmation affects only that row
- **WHEN** the Owner requests deletion of a watering event and confirms the destructive action
- **THEN** that single watering event is removed from its plant and the UI no longer lists it, while the parent plant, its other watering events, and its growth measurements are all left unchanged (FR-WATER-05, SC-5, NFR-DATA-02)

#### Scenario: Cancel deletion
- **WHEN** the Owner requests deletion of a watering event but cancels at the confirmation step
- **THEN** the watering event is retained unchanged and no delete is performed (NFR-USA-02, NFR-DATA-02)

#### Scenario: Delete a non-existent watering event
- **WHEN** the Owner attempts to delete a watering-event id that does not exist (e.g. one already deleted)
- **THEN** the request is rejected with a not-found result and no error page or raw 500 is rendered (NFR-DATA-02)
