## ADDED Requirements

### Requirement: Add a plant
The system SHALL let the Owner add a plant with a required name (FR-PLANT-01). The name is trimmed of leading/trailing whitespace, must be non-empty after trimming, and must be at most 200 characters after trimming. On creation the species defaults to "money tree / Crassula ovata" (stored as the canonical Ukrainian display string) and is editable as bounded free text accepted verbatim up to 200 characters (FR-PLANT-02); the acquired date is optional and, when set, is a local calendar date (Europe/Kiev) with no time-of-day, entered via a native date picker (`<input type="date">`), stored as ISO `YYYY-MM-DD`, displayed as `DD.MM.YYYY`, and must not be after today in Europe/Kiev (FR-PLANT-03, NFR-USA-03, SC-1, SC-2). Validation failures are surfaced inline next to the offending field, never as a raw error or silent failure (NFR-USA-02, FR-SHELL-03). Saving completes and the UI reflects the new plant within 300 ms for a realistic local dataset (<= 20 plants, <= 500 events total) (NFR-PERF-01). There is no authentication; all actions are performed by the single local Owner (NFR-SEC-01). Photos (FR-PLANT-09) and search/filter (FR-PLANT-10) are Future and intentionally excluded.

#### Scenario: Add a plant with only a name
- **WHEN** the Owner submits the add-plant form with a non-empty name and leaves species and acquired date untouched
- **THEN** a plant is created with the given name, species pre-filled as the default "money tree / Crassula ovata", and no acquired date, and the new plant appears in the plant list (FR-PLANT-01, FR-PLANT-02)

#### Scenario: Add a plant with name, custom species, and acquired date
- **WHEN** the Owner submits the add-plant form with a name, a custom free-text species, and an acquired date not after today in Europe/Kiev
- **THEN** a plant is created storing exactly those values and the new plant appears in the plant list (FR-PLANT-01, FR-PLANT-02, FR-PLANT-03)

#### Scenario: Name is trimmed before storage
- **WHEN** the Owner submits the add-plant form with a name that has leading and trailing whitespace around otherwise valid text (e.g. "  Ficus  ")
- **THEN** the plant is created with the trimmed name (e.g. "Ficus"), and the stored value contains no leading or trailing whitespace (FR-PLANT-01)

#### Scenario: Reject a missing name
- **WHEN** the Owner submits the add-plant form with an empty or whitespace-only name
- **THEN** no plant is created and a clear validation message is shown inline next to the name field, not a raw error or silent failure (FR-PLANT-01, NFR-USA-02, FR-SHELL-03)

#### Scenario: Reject an oversize name
- **WHEN** the Owner submits the add-plant form with a name that exceeds 200 characters after trimming
- **THEN** no plant is created and a clear validation message is shown inline next to the name field, not a raw error or silent failure (FR-PLANT-01, NFR-USA-02)

#### Scenario: Accept species free text verbatim within bound
- **WHEN** the Owner submits a species value of arbitrary free text (including punctuation or non-Latin characters) that is at most 200 characters
- **THEN** the plant is created storing the species exactly as entered, with no format or vocabulary validation applied (FR-PLANT-02)

#### Scenario: Reject an oversize species
- **WHEN** the Owner submits the add-plant form with a species value that exceeds 200 characters
- **THEN** no plant is created and a clear validation message is shown inline next to the species field, not a raw error or silent failure (FR-PLANT-02, NFR-USA-02)

#### Scenario: Acquired date entered via native picker, stored as ISO, displayed as DD.MM.YYYY
- **WHEN** the Owner picks an acquired date with the native date picker (`<input type="date">`) and saves
- **THEN** the plant stores that value as an ISO `YYYY-MM-DD` calendar date in the Owner's local timezone (Europe/Kiev) with no time-of-day component, and the same date is shown back on the detail view formatted as `DD.MM.YYYY` (Ukrainian locale) (FR-PLANT-03, SC-1, NFR-USA-03, NFR-LOC-01)

#### Scenario: Reject a malformed or out-of-range acquired date
- **WHEN** the Owner submits the add-plant form with an acquired date that is not a valid calendar date (e.g. an impossible date such as 2026-02-30, or a value that does not match `YYYY-MM-DD`)
- **THEN** no plant is created and a clear validation message is shown inline next to the acquired-date field, not a raw error or silent failure (FR-PLANT-03, NFR-USA-02, NFR-USA-03, SC-1)

#### Scenario: Reject a future acquired date
- **WHEN** the Owner submits the add-plant form with an acquired date after today in Europe/Kiev
- **THEN** no plant is created and a clear validation message is shown inline next to the acquired-date field, because an acquired date cannot be in the future (FR-PLANT-03, SC-2, FR-SHELL-03, NFR-USA-02)

### Requirement: View the plant list
The system SHALL let the Owner view a list of all plants (FR-PLANT-04), and SHALL show a helpful empty state when no plants exist (FR-PLANT-08). The list reflects all persisted plants across page reloads and app restarts (NFR-DATA-01, SC-4). The list replaces the slice-1 placeholder home content (including its example demo form). The list order is deterministic.

#### Scenario: List shows all plants
- **WHEN** the Owner opens the plant list and one or more plants exist
- **THEN** every plant is listed with at least its name visible, each linking to its detail view (FR-PLANT-04)

#### Scenario: Empty state when no plants exist
- **WHEN** the Owner opens the plant list and no plants exist
- **THEN** a helpful empty-state message is shown instead of a blank screen, inviting the Owner to add their first plant (FR-PLANT-08)

#### Scenario: Plants persist across restart
- **WHEN** plants have been created and the app is reloaded or restarted
- **THEN** the previously created plants are still present in the list (NFR-DATA-01, SC-4)

### Requirement: View a plant detail
The system SHALL let the Owner open a single plant's detail view (FR-PLANT-05), showing the plant's name, species, and acquired date (formatted `DD.MM.YYYY`) when set. A detail request for a plant that does not exist resolves to a not-found state, never a raw 500 or silent failure.

#### Scenario: Open an existing plant detail
- **WHEN** the Owner selects a plant from the list
- **THEN** the plant's detail view opens showing its name, species, and acquired date formatted as `DD.MM.YYYY` (or an empty/placeholder indication when no acquired date is set) (FR-PLANT-05, SC-1)

#### Scenario: Open a non-existent plant
- **WHEN** the Owner navigates to a plant detail for an id that does not exist (e.g. a stale link to a deleted plant)
- **THEN** a friendly not-found state is shown, not a raw 500 or silent failure (FR-PLANT-05)

#### Scenario: Open a detail for a plant deleted in another tab
- **WHEN** the Owner opens or refreshes a plant detail view for a plant that has since been deleted in another tab or session
- **THEN** a not-found state is shown, not a raw 500 or silent failure, and no stale data is presented as if the plant still exists (FR-PLANT-05, NFR-DATA-02)

### Requirement: Edit a plant
The system SHALL let the Owner edit a plant's name, species, and acquired date (FR-PLANT-06). The edit enforces the same validation rules as creation: name is trimmed and must be non-empty and at most 200 characters after trimming, species is bounded free text at most 200 characters accepted verbatim, and the acquired date (when set) is a valid local calendar date (Europe/Kiev) with no time-of-day, entered via the native date picker, stored as ISO `YYYY-MM-DD`, displayed as `DD.MM.YYYY`, and not after today in Europe/Kiev (NFR-USA-03, SC-1, SC-2). Validation is surfaced inline (NFR-USA-02, FR-SHELL-03). An edit submission is applied all-or-nothing: if any field fails validation, the entire submission is rejected and no field is persisted, so the stored record remains exactly as it was before the submission (NFR-DATA-02). On success the UI reflects the saved change within 300 ms for a realistic local dataset (NFR-PERF-01). No data beyond the edited fields is altered, and the plant's measurements and watering events are unaffected (NFR-DATA-02).

#### Scenario: Edit name, species, and acquired date
- **WHEN** the Owner changes the name, species, and acquired date to valid values and saves
- **THEN** the plant stores the updated values, the detail and list views reflect them, and the plant's measurements and watering events are unchanged (FR-PLANT-06, NFR-DATA-02)

#### Scenario: Clear the acquired date
- **WHEN** the Owner removes a previously set acquired date and saves
- **THEN** the plant is stored with no acquired date and no other field is changed (FR-PLANT-06, NFR-DATA-02)

#### Scenario: Reject clearing the name on edit, discarding the whole submission
- **WHEN** the Owner clears the name to empty or whitespace-only while also changing the species and/or acquired date in the same submission, and saves
- **THEN** the change is rejected as a whole (all-or-nothing); the prior name, species, and acquired date are all preserved exactly as before the submission (the edited species and date are NOT partially applied), and a clear validation message is shown inline next to the name field (FR-PLANT-06, NFR-USA-02, NFR-DATA-02)

#### Scenario: Reject an oversize name or species on edit, discarding the whole submission
- **WHEN** the Owner submits an edit whose name exceeds 200 characters (after trimming) or whose species exceeds 200 characters
- **THEN** the change is rejected as a whole (all-or-nothing); no field is persisted, the stored record remains exactly as before the submission, and a clear validation message is shown inline next to the offending field (FR-PLANT-06, NFR-USA-02, NFR-DATA-02)

#### Scenario: Reject a malformed, out-of-range, or future acquired date on edit, discarding the whole submission
- **WHEN** the Owner submits an edit with an acquired date that is not a valid calendar date (e.g. an impossible date such as 2026-02-30) or that is after today in Europe/Kiev
- **THEN** the change is rejected as a whole (all-or-nothing); no field is persisted, the stored record remains exactly as before the submission, and a clear validation message is shown inline next to the acquired-date field (FR-PLANT-06, NFR-USA-02, NFR-USA-03, NFR-DATA-02, SC-1, SC-2)

#### Scenario: Edit a plant deleted in another tab
- **WHEN** the Owner submits an edit for a plant that has since been deleted in another tab or session
- **THEN** no record is created or resurrected, a not-found state is shown (not a raw 500 or silent failure), and no other plant's data is altered (FR-PLANT-06, NFR-DATA-02)

### Requirement: Delete a plant with confirmation and cascade
The system SHALL let the Owner delete a plant only after an explicit confirmation step, and deletion SHALL also remove that plant's own measurements and watering events (FR-PLANT-07). No data is lost on normal flows and the cascade SHALL NOT extend beyond the deleted plant's own children (NFR-DATA-02, NFR-USA-02, SC-5). Deleting a plant that has already been deleted resolves to a no-op not-found state, never a raw 500.

#### Scenario: Confirm deletion cascades the plant's children
- **WHEN** the Owner deletes a plant and confirms the destructive action
- **THEN** the plant and all of its own measurements and watering events are removed, the plant no longer appears in the list, and other plants and their data are untouched (FR-PLANT-07, NFR-DATA-02, SC-5)

#### Scenario: Cancel deletion leaves data intact
- **WHEN** the Owner triggers delete but cancels at the confirmation step
- **THEN** the plant and all of its measurements and watering events remain unchanged (FR-PLANT-07, NFR-DATA-02)

#### Scenario: Deletion is explicit, never silent
- **WHEN** the Owner initiates a plant deletion
- **THEN** a confirmation step is required before any data is removed; nothing is deleted without that confirmation (FR-PLANT-07, NFR-DATA-02, NFR-USA-02, SC-5)

#### Scenario: Delete a plant already deleted in another tab
- **WHEN** the Owner confirms deletion of a plant that has already been deleted in another tab or session
- **THEN** the operation resolves to a no-op with a not-found state, not a raw 500 or silent failure; no other plant or its children are affected (FR-PLANT-07, NFR-DATA-02)
