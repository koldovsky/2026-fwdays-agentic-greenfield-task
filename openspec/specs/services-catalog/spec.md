## Purpose

Wizard step 5: select or create service lines for the document, with a reusable catalog at `{data-root}/jobs/services.json` (FR-11, FR-12, NFR-04, NFR-10, NFR-12, NFR-13).

## Requirements

### Requirement: User can select or create services on step 5
The system SHALL present wizard step 5 with UI to select services from the catalog and/or create new service lines for the document (FR-11). Each line SHALL include `sign-name`, `service-name`, `amount`, and `price` (FR-12). The system SHALL allow multiple service lines in one document («додати ще»). On successful confirm («Далі»), the system SHALL persist/update the catalog at `{data-root}/jobs/services.json` and store the confirmed lines as a full snapshot on the session `services` array. JSON keys SHALL use kebab-case (NFR-13).

#### Scenario: Add two services to the document
- **WHEN** a user on step 5 adds two service lines with all four fields and confirms «Далі»
- **THEN** both lines are present in the session `services` array, and the catalog file contains entries with `sign-name`, `service-name`, `amount`, and `price` for those services (TC-14)

#### Scenario: Select existing catalog service into a line
- **WHEN** a user on step 5 picks an existing catalog entry for a document line and confirms «Далі»
- **THEN** the session line is filled from that entry’s fields (with any user-edited amount/price) and the catalog still stores that service without creating a duplicate identity for the same `sign-name`

#### Scenario: Create new service writes catalog
- **WHEN** a user on step 5 creates a service with a new `sign-name` and confirms «Далі»
- **THEN** `{data-root}/jobs/services.json` includes that service and the session `services` snapshot matches the confirmed line fields

### Requirement: At least one valid service line required to advance
The system SHALL require at least one service line before advancing from step 5. Each line SHALL have non-empty trimmed `sign-name` and `service-name`, a finite `amount` greater than zero, and a finite `price` greater than or equal to zero. Incomplete or empty-only line sets SHALL block «Далі».

#### Scenario: Empty services block Next
- **WHEN** a user on step 5 has no valid service lines
- **THEN** «Далі» does not advance the wizard

#### Scenario: Incomplete line blocks Next
- **WHEN** any included service line is missing a required field or has invalid amount/price
- **THEN** «Далі» does not advance the wizard

### Requirement: Services catalog is a single JSON array file
The system SHALL store the reusable services catalog as a JSON array at `{data-root}/jobs/services.json` (FR-11, NFR-12). Updating a catalog entry with the same trimmed `sign-name` SHALL overwrite that entry in the array (last write wins). A missing catalog file SHALL be treated as an empty list on read. Catalog and session persistence failures SHALL be shown to the user; the wizard MUST NOT advance on failure (NFR-10).

#### Scenario: Missing catalog reads as empty
- **WHEN** the catalog file does not exist and the step loads the catalog
- **THEN** the UI receives an empty list and does not error as a hard failure

#### Scenario: Persistence failure stays on step
- **WHEN** writing the catalog file or patching the session fails after the user confirms
- **THEN** the user sees an error and the wizard remains on step 5

### Requirement: Session service lines survive reload
The system SHALL restore step 5 with the session’s `services` snapshot when present after reload or «Назад», without creating a new session `guid` (NFR-04).

#### Scenario: Reload on step 5 keeps service lines
- **WHEN** a user has confirmed or edited service lines on step 5 and reloads `/docs/{guid}` while still on step 5 or returns to it
- **THEN** the same `guid` and `services` lines are restored
