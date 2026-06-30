## ADDED Requirements

### Requirement: Log a height measurement
The system SHALL let the Owner log a growth measurement for a plant — a height value in centimetres on a given calendar date, where the date defaults to today in the Owner's local calendar (Europe/Kiev) per FR-GROWTH-01 and NFR-USA-03. The date is entered with a native date picker (`<input type="date">`), stored as ISO `YYYY-MM-DD`, and displayed as `DD.MM.YYYY` (SC-1); a date after today in Europe/Kiev is rejected (SC-2). Each measurement SHALL belong to exactly one plant via a foreign key to `plants.id` declared `ON DELETE CASCADE` (deleting the plant removes its measurements; SC-5).

#### Scenario: Log with explicit date
- **WHEN** the Owner submits a valid height in cm and a chosen calendar date not after today in Europe/Kiev for an existing plant
- **THEN** a measurement is created for that plant with the given height and date, and the UI reflects the new measurement (FR-GROWTH-01)

#### Scenario: Date defaults to today
- **WHEN** the Owner submits a valid height with no date provided
- **THEN** the measurement is saved with today's date in the Europe/Kiev local calendar, with no time-of-day component (FR-GROWTH-01, NFR-USA-03)

#### Scenario: Measurement performance for a realistic dataset
- **WHEN** the Owner adds a measurement against a realistic dataset (<= 20 plants, <= 500 events total)
- **THEN** the UI reflects the change within 300 ms locally (NFR-PERF-01)

#### Scenario: Missing height
- **WHEN** the Owner submits the form with no height value (empty or whitespace-only)
- **THEN** an inline validation error is shown next to the height field and no measurement is created (no raw 500, no silent failure) (FR-GROWTH-05, FR-SHELL-03)

#### Scenario: Reject invalid date
- **WHEN** the Owner submits a valid height with a date that is malformed (e.g. "not-a-date"), an impossible calendar date (e.g. "2026-13-40" or "2026-02-30"), or a date after today in Europe/Kiev
- **THEN** an inline validation error is shown next to the date field and no measurement is created (no raw 500, no silent failure) (SC-1, SC-2, FR-SHELL-03)

#### Scenario: Log against a non-existent plant
- **WHEN** the Owner attempts to log a measurement for a plant id that does not exist
- **THEN** the request is rejected with a not-found result and no measurement is created (no raw 500, no silent failure) (NFR-DATA-02)

### Requirement: View a plant's measurements
The system SHALL let the Owner view the list of a plant's height measurements ordered by date descending (most recent first) per FR-GROWTH-02. Because measurements are date-only, two measurements on the SAME date SHALL be tie-broken deterministically by row id in descending order (the most recently created measurement of that day appears first) per SC-3. The list SHALL present the underlying values (height and date), not only a chart (NFR-A11Y-03). Measurements persist across page reloads and app restarts (SC-4, NFR-DATA-01).

#### Scenario: List ordered by date descending
- **WHEN** the Owner opens a plant that has measurements on distinct dates
- **THEN** the measurements are displayed as a list ordered by date descending (most recent date first), each row showing the height in cm and the measurement date as `DD.MM.YYYY` (FR-GROWTH-02, SC-1, SC-3)

#### Scenario: Deterministic tie-break for same-date measurements
- **WHEN** the Owner opens a plant that has two or more measurements sharing the same date
- **THEN** those same-date measurements are ordered by row id descending (the more recently created measurement first), so the overall order is deterministic and reproducible (SC-3)

#### Scenario: Measurements persist across restart
- **WHEN** measurements have been logged for a plant and the app is reloaded or restarted
- **THEN** the previously logged measurements are still present in that plant's measurement list (SC-4, NFR-DATA-01)

#### Scenario: Empty state
- **WHEN** the Owner opens a plant that has no measurements
- **THEN** the measurements section shows a clear empty state instead of an error or a blank area (FR-GROWTH-02)

#### Scenario: View a non-existent plant
- **WHEN** the Owner opens a plant id that does not exist
- **THEN** a not-found result is shown instead of measurements and no raw 500 or blank area is rendered (NFR-DATA-02)

### Requirement: Edit a measurement
The system SHALL let the Owner edit a measurement's height value and date per FR-GROWTH-03. Edits SHALL re-apply the same height-parse and date validation as logging, and SHALL be all-or-nothing: a rejected edit leaves the original measurement unchanged (NFR-DATA-02).

#### Scenario: Edit height and date
- **WHEN** the Owner changes the height and/or date of an existing measurement to valid values
- **THEN** the measurement is updated and the UI reflects the new height and date (FR-GROWTH-03)

#### Scenario: Edit to invalid height
- **WHEN** the Owner edits a measurement's height to a value that fails the height-parse rule (non-numeric, negative, zero, over-precision, over-bound, or containing a grouping/multiple separator)
- **THEN** an inline validation error is shown next to the height field and the original measurement is left unchanged (FR-GROWTH-05, NFR-DATA-02)

#### Scenario: Edit to invalid date
- **WHEN** the Owner edits a measurement's date to a malformed, impossible, or future value as defined under "Validate height input"
- **THEN** an inline validation error is shown next to the date field and the original measurement is left unchanged (SC-2, NFR-DATA-02)

#### Scenario: Edit a non-existent measurement
- **WHEN** the Owner attempts to edit a measurement id that does not exist (e.g. one deleted in another tab)
- **THEN** the request is rejected with a not-found result and no measurement is created or modified (no raw 500, no silent failure) (NFR-DATA-02)

### Requirement: Delete a measurement
The system SHALL let the Owner delete a measurement, with an explicit confirmation step, per FR-GROWTH-04. The delete SHALL affect only that single measurement row — it does NOT cascade to the parent plant, to other measurements, or to watering events (only plant deletion cascades, per FR-PLANT-07) (SC-5, NFR-DATA-02).

#### Scenario: Delete after confirmation affects only that row
- **WHEN** the Owner requests deletion of a measurement and confirms the destructive action
- **THEN** that single measurement is removed from its plant and the UI no longer lists it, while the parent plant, its other measurements, and its watering events are all left unchanged (FR-GROWTH-04, SC-5, NFR-DATA-02)

#### Scenario: Cancel deletion
- **WHEN** the Owner requests deletion of a measurement but cancels at the confirmation step
- **THEN** the measurement is retained unchanged and no delete is performed (NFR-USA-02, NFR-DATA-02)

#### Scenario: Delete a non-existent measurement
- **WHEN** the Owner attempts to delete a measurement id that does not exist (e.g. one already deleted)
- **THEN** the request is rejected with a not-found result and no error page or raw 500 is rendered (NFR-DATA-02)

### Requirement: Validate height input
The system SHALL validate height input per FR-GROWTH-05 against the following decidable rules. A height value SHALL be accepted only if it parses to a number that is strictly greater than 0, is at most 1000 cm (the upper bound), and has at most one decimal place. A blank or whitespace-only height is rejected (height is required when logging). Zero is rejected as not a valid height. The system SHALL accept a single decimal separator that is either a dot (".") or a comma (",") and treat the comma as the decimal separator; it SHALL reject any input containing a grouping/thousands separator or more than one separator as non-numeric, because such inputs are ambiguous in the Owner's Europe/Kiev locale. The accepted numeric value is stored as a number (height in cm). Date input on logging and editing SHALL be a valid, real calendar date that is not after today in Europe/Kiev; malformed text, impossible dates, and future dates are rejected. Validation failures SHALL be surfaced inline next to the offending field (never a raw 500 or silent failure), and the form SHALL repopulate the Owner's submitted values (FR-SHELL-03).

#### Scenario: Accept decimal value with dot
- **WHEN** the Owner enters a height of "12.5"
- **THEN** the value is accepted and stored as 12.5 cm (FR-GROWTH-05)

#### Scenario: Accept decimal comma
- **WHEN** the Owner enters a height of "12,5" using a decimal comma
- **THEN** the value is accepted and stored as 12.5 cm, the comma being treated as the decimal separator (FR-GROWTH-05, NFR-LOC-01)

#### Scenario: Accept trailing zeros
- **WHEN** the Owner enters a height of "12.50" or "12,50"
- **THEN** the value is accepted and stored as 12.5 cm (FR-GROWTH-05)

#### Scenario: Accept an integer value with no separator
- **WHEN** the Owner enters a whole-number height such as "42"
- **THEN** the value is accepted and stored as 42 cm (FR-GROWTH-05)

#### Scenario: Reject blank height
- **WHEN** the Owner submits an empty or whitespace-only height
- **THEN** an inline validation error is shown next to the height field and no measurement is created or updated, because a height is required (FR-GROWTH-05, FR-SHELL-03)

#### Scenario: Reject non-numeric value
- **WHEN** the Owner enters a non-numeric height such as "tall" or "abc"
- **THEN** an inline validation error is shown next to the height field and no measurement is created or updated (FR-GROWTH-05)

#### Scenario: Reject negative value
- **WHEN** the Owner enters a negative height such as "-3"
- **THEN** an inline validation error is shown next to the height field and no measurement is created or updated (FR-GROWTH-05)

#### Scenario: Reject zero
- **WHEN** the Owner enters a height of "0" or "0,0"
- **THEN** an inline validation error is shown next to the height field and no measurement is created or updated, because a valid height must be strictly greater than 0 (FR-GROWTH-05)

#### Scenario: Reject oversized value
- **WHEN** the Owner enters a height that exceeds the upper bound, such as "1000.1" or "999999999"
- **THEN** an inline validation error is shown next to the height field and no measurement is created or updated, because a valid height must be at most 1000 cm (FR-GROWTH-05)

#### Scenario: Reject excessive decimal precision
- **WHEN** the Owner enters a height with more than one decimal place, such as "12.55" or "12,555"
- **THEN** an inline validation error is shown next to the height field and no measurement is created or updated, because at most one decimal place is allowed (FR-GROWTH-05)

#### Scenario: Reject grouping or multiple separators
- **WHEN** the Owner enters a height containing a grouping/thousands separator or more than one separator, such as "1,000", "12.5.5", or "1 200,5"
- **THEN** the input is treated as non-numeric, an inline validation error is shown next to the height field, and no measurement is created or updated, because such inputs are ambiguous in the Europe/Kiev locale (FR-GROWTH-05, NFR-LOC-01)
