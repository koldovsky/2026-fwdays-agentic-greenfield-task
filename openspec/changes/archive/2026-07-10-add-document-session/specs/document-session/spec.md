## ADDED Requirements

### Requirement: Create document session with guid and JSON file
The system SHALL create a document session with a unique UUID v4 `guid` and persist its state as JSON at `{data-root}/docs/{guid}.json` (FR-01). The default data-root SHALL be relative to the application working directory and configurable (NFR-12). Starting a new flow from `/` SHALL create a session and redirect the client to `/docs/{guid}` (TC-01).

#### Scenario: Start new flow creates guid, file, and URL
- **WHEN** a user opens `/` to start a new document flow
- **THEN** the system creates a new `guid`, writes `{data-root}/docs/{guid}.json`, and redirects to `/docs/{guid}`

#### Scenario: New session has initial defaults
- **WHEN** a session is created
- **THEN** the JSON includes `guid`, `doc-type` defaulting to `invoice_act`, `current-step` of `1`, `completed` of `false`, a `date`, an empty `services` array, and `updated-at`

### Requirement: Restore session from persistent URL
The system SHALL expose a stable session URL `/docs/{guid}` (FR-02). Opening that URL SHALL load the session from the filesystem (NFR-03) and MUST NOT create a new `guid` (NFR-04).

#### Scenario: Open unfinished session resumes current step
- **WHEN** a user opens `/docs/{guid}` for a session with `completed` false
- **THEN** the system restores the saved state and presents the session at its stored `current-step` (TC-02)

#### Scenario: Open completed session shows final review
- **WHEN** a user opens `/docs/{guid}` for a session with `completed` true
- **THEN** the system restores the saved state and presents the final review (step 7 semantics) (TC-03)

#### Scenario: Reload preserves guid and step
- **WHEN** a user reloads `/docs/{guid}` while on a given `current-step` (e.g. step 4)
- **THEN** the same `guid` and `current-step` are restored without regenerating identifiers or clearing saved fields (TC-21, NFR-04)

### Requirement: Read and update session state
The system SHALL provide server operations to read and update a session by `guid`. Updates SHALL be written immediately to `{data-root}/docs/{guid}.json` and SHALL refresh `updated-at`. JSON keys SHALL use kebab-case per the document session schema (NFR-13).

#### Scenario: Get session returns JSON state
- **WHEN** a client requests the session for a valid existing `guid`
- **THEN** the system returns the full persisted JSON state

#### Scenario: Patch session persists fields
- **WHEN** a client patches allowed session fields for a valid `guid`
- **THEN** the file on disk reflects the merged state and an updated `updated-at`

#### Scenario: Save failure is visible
- **WHEN** persisting a session update fails (e.g. filesystem error)
- **THEN** the system returns an error response that can be shown to the user and does not silently pretend success (NFR-10)

### Requirement: Export session JSON
The system SHALL allow exporting or downloading the completed (or in-progress) session as the JSON document state file `docs/{guid}.json` (FR-19).

#### Scenario: Download session JSON
- **WHEN** a user requests export of a valid session
- **THEN** the system provides the contents of `{data-root}/docs/{guid}.json` as a downloadable JSON file

### Requirement: Invalid guid handling
The system SHALL reject invalid or non-existent `guid` values with a clear error and MUST NOT create a broken or empty session file for that request (TC-25). Access remains by knowledge of `guid` only (NFR-11, BC-09).

#### Scenario: Missing session file
- **WHEN** a user opens `/docs/{guid}` or requests API access for a well-formed `guid` with no file on disk
- **THEN** the system shows or returns a clear not-found error and does not create `{data-root}/docs/{guid}.json`

#### Scenario: Malformed guid
- **WHEN** a user supplies a `guid` that is not a valid UUID
- **THEN** the system shows or returns a clear error and does not write any session file for that value
