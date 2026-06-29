## MODIFIED Requirements

### Requirement: Add a plant
The system SHALL let the Owner add a plant with a required name (FR-PLANT-01). The name is trimmed of leading/trailing whitespace, must be non-empty after trimming, and must be at most 200 characters after trimming. On creation the species defaults to "money tree / Crassula ovata" and is editable as bounded free text accepted verbatim up to 200 characters (FR-PLANT-02); the acquired date is optional and, when set, is a local calendar date (Europe/Kiev) with no time-of-day, entered via a native date picker, stored as ISO `YYYY-MM-DD`, displayed as `DD.MM.YYYY`, and must not be after today in Europe/Kiev (FR-PLANT-03, NFR-USA-03, A5/Q8, SC-1, SC-2). On creation the plant ALSO has a watering interval `intervalDays` that defaults to 7 when not supplied and, when supplied, must be a positive integer (a whole number `>= 1`); a zero, negative, decimal, or non-numeric interval is rejected inline next to the interval field (FR-REM-01, FR-SHELL-03, NFR-USA-02). Saving completes and the UI reflects the new plant within 300 ms for a realistic local dataset (<= 20 plants, <= 500 events total) (NFR-PERF-01). There is no authentication; all actions are performed by the single local Owner (NFR-SEC-01).

#### Scenario: Add a plant with only a name
- **WHEN** the Owner submits the add-plant form with a non-empty name and leaves species, acquired date, and watering interval untouched
- **THEN** a plant is created with the given name, species pre-filled as "money tree / Crassula ovata", no acquired date, and `intervalDays` of 7 (the default), and the new plant appears in the plant list

#### Scenario: Add a plant with name, custom species, and acquired date
- **WHEN** the Owner submits the add-plant form with a name, a custom free-text species, and an acquired date
- **THEN** a plant is created storing exactly those values and the new plant appears in the plant list

#### Scenario: Add a plant with a custom watering interval
- **WHEN** the Owner submits the add-plant form with a name and a watering interval of a positive integer (e.g. 14)
- **THEN** a plant is created storing `intervalDays` of 14 (FR-REM-01)

#### Scenario: Name is trimmed before storage
- **WHEN** the Owner submits the add-plant form with a name that has leading and trailing whitespace around otherwise valid text (e.g. "  Ficus  ")
- **THEN** the plant is created with the trimmed name (e.g. "Ficus"), and the stored value contains no leading or trailing whitespace

#### Scenario: Reject a missing name
- **WHEN** the Owner submits the add-plant form with an empty or whitespace-only name
- **THEN** no plant is created and a clear validation message is shown inline next to the name field (not a raw error or silent failure) (NFR-USA-02)

#### Scenario: Reject an oversize name
- **WHEN** the Owner submits the add-plant form with a name that exceeds 200 characters after trimming
- **THEN** no plant is created and a clear validation message is shown inline next to the name field (not a raw error or silent failure) (NFR-USA-02)

#### Scenario: Accept species free text verbatim within bound
- **WHEN** the Owner submits a species value of arbitrary free text (including punctuation or non-Latin characters) that is at most 200 characters
- **THEN** the plant is created storing the species exactly as entered, with no format or vocabulary validation applied

#### Scenario: Reject an oversize species
- **WHEN** the Owner submits the add-plant form with a species value that exceeds 200 characters
- **THEN** no plant is created and a clear validation message is shown inline next to the species field (not a raw error or silent failure) (NFR-USA-02)

#### Scenario: Acquired date entered via native picker, stored as ISO, displayed as DD.MM.YYYY
- **WHEN** the Owner picks an acquired date with the native date picker and saves
- **THEN** the plant stores that value as an ISO `YYYY-MM-DD` calendar date in the Owner's local timezone (Europe/Kiev) with no time-of-day component, and the same date is shown back on the detail view formatted as `DD.MM.YYYY` (Ukrainian locale) (SC-1, NFR-USA-03, NFR-LOC-01, A5/Q8)

#### Scenario: Reject a malformed or out-of-range acquired date
- **WHEN** the Owner submits the add-plant form with an acquired date that is not a valid calendar date (e.g. an impossible date such as 2026-02-30 or a value the native date picker cannot represent)
- **THEN** no plant is created and a clear validation message is shown inline next to the acquired-date field (not a raw error or silent failure) (NFR-USA-02, NFR-USA-03)

#### Scenario: Reject a future acquired date
- **WHEN** the Owner submits the add-plant form with an acquired date after today in Europe/Kiev
- **THEN** no plant is created and a clear validation message is shown inline next to the acquired-date field (not a raw error or silent failure), because an acquired date cannot be in the future (SC-2, FR-SHELL-03, NFR-USA-02)

#### Scenario: Reject a non-positive, non-integer, or non-numeric watering interval on add
- **WHEN** the Owner submits the add-plant form with a watering interval of 0, a negative number, a decimal (e.g. 7.5), or non-numeric text
- **THEN** no plant is created and a clear validation message is shown inline next to the interval field (not a raw error or silent failure) (FR-REM-01, FR-SHELL-03, NFR-USA-02)

### Requirement: Edit a plant
The system SHALL let the Owner edit a plant's name, species, acquired date, and watering interval (FR-PLANT-06, FR-REM-01). The edit enforces the same validation rules as creation: name is trimmed and must be non-empty and at most 200 characters after trimming, species is bounded free text at most 200 characters accepted verbatim, the acquired date (when set) is a valid local calendar date (Europe/Kiev) with no time-of-day, entered via the native date picker, stored as ISO `YYYY-MM-DD`, displayed as `DD.MM.YYYY`, and not after today in Europe/Kiev (NFR-USA-03, SC-1, SC-2), and the watering interval must be a positive integer (a whole number `>= 1`) — a zero, negative, decimal, or non-numeric interval is rejected (FR-REM-01). Validation is surfaced inline (NFR-USA-02). An edit submission is applied all-or-nothing: if any field fails validation, the entire submission is rejected and no field is persisted, so the stored record remains exactly as it was before the submission (NFR-DATA-02). On success the UI reflects the saved change within 300 ms for a realistic local dataset (NFR-PERF-01), and the plant's derived watering status (FR-REM-02) is recomputed against the new interval. No data beyond the edited fields is altered (NFR-DATA-02).

#### Scenario: Edit name, species, and acquired date
- **WHEN** the Owner changes the name, species, and acquired date and saves
- **THEN** the plant stores the updated values, the detail and list views reflect them, and the plant's measurements and watering events are unchanged (NFR-DATA-02)

#### Scenario: Edit the watering interval to a valid positive integer
- **WHEN** the Owner changes the watering interval to a positive integer (e.g. 14) and saves
- **THEN** the plant stores `intervalDays` of 14, the value persists across reload/restart, and the plant's derived watering status is recomputed against the new interval (FR-REM-01, FR-REM-02)

#### Scenario: Clear the acquired date
- **WHEN** the Owner removes a previously set acquired date and saves
- **THEN** the plant is stored with no acquired date and no other field is changed

#### Scenario: Reject clearing the name on edit, discarding the whole submission
- **WHEN** the Owner clears the name to empty or whitespace-only while also changing the species and/or acquired date in the same submission, and saves
- **THEN** the change is rejected as a whole (all-or-nothing); the prior name, species, acquired date, and interval are all preserved exactly as before the submission (the edited fields are NOT partially applied), and a clear validation message is shown inline next to the name field (NFR-USA-02, NFR-DATA-02)

#### Scenario: Reject an oversize name or species on edit, discarding the whole submission
- **WHEN** the Owner submits an edit whose name exceeds 200 characters (after trimming) or whose species exceeds 200 characters
- **THEN** the change is rejected as a whole (all-or-nothing); no field is persisted, the stored record remains exactly as before the submission, and a clear validation message is shown inline next to the offending field (NFR-USA-02, NFR-DATA-02)

#### Scenario: Reject a malformed, out-of-range, or future acquired date on edit, discarding the whole submission
- **WHEN** the Owner submits an edit with an acquired date that is not a valid calendar date (e.g. an impossible date such as 2026-02-30) or that is after today in Europe/Kiev
- **THEN** the change is rejected as a whole (all-or-nothing); no field is persisted, the stored record remains exactly as before the submission, and a clear validation message is shown inline next to the acquired-date field (NFR-USA-02, NFR-USA-03, NFR-DATA-02, SC-1, SC-2)

#### Scenario: Reject an invalid watering interval on edit, discarding the whole submission
- **WHEN** the Owner submits an edit with a watering interval of 0, a negative number, a decimal (e.g. 7.5), or non-numeric text
- **THEN** the change is rejected as a whole (all-or-nothing); no field is persisted, the stored `intervalDays` (and every other field) remains exactly as before the submission, and a clear validation message is shown inline next to the interval field (FR-REM-01, FR-SHELL-03, NFR-USA-02, NFR-DATA-02)

#### Scenario: Edit a plant deleted in another tab
- **WHEN** the Owner submits an edit for a plant that has since been deleted in another tab or session
- **THEN** no record is created or resurrected, a not-found state is shown (not a raw 500 or silent failure), and no other plant's data is altered (NFR-DATA-02)
