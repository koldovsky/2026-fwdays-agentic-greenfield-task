## Purpose

Wizard steps 3–4: create or select customer (`client`) and contractor (`done-by`) contacts keyed by РНОКПП, with a shared catalog under `{data-root}/contacts/` (FR-08, FR-09, FR-10, NFR-04, NFR-05, NFR-10, NFR-12, NFR-13, BC-05).

## Requirements

### Requirement: User can create or select customer contact on step 3
The system SHALL present wizard step 3 (замовник) with UI to select an existing contact from the catalog or create a new one (FR-08). Contact fields SHALL be `full-name`, `inn` (РНОКПП), `phone`, `acc`, `bank`, `mfo-bank`, and `addr` (FR-10). On successful confirm («Далі»), the system SHALL persist the contact to `{data-root}/contacts/{inn}.json` and store a full field snapshot on the session as `client`. All listed fields SHALL be required (non-empty after trim) before advancing.

#### Scenario: Create customer writes catalog file
- **WHEN** a user on step 3 fills all contact fields with a new РНОКПП and confirms «Далі»
- **THEN** a file `./contacts/{inn}.json` exists under the data root with those fields, and the session `client` snapshot matches them (TC-11)

#### Scenario: Select existing customer does not duplicate file
- **WHEN** a user on step 3 selects an existing catalog contact and confirms «Далі»
- **THEN** the session `client` is filled from that contact’s fields and the catalog still has a single file for that `inn` (TC-12)

#### Scenario: Incomplete customer blocks Next
- **WHEN** any required customer field is empty on step 3
- **THEN** «Далі» does not advance the wizard

### Requirement: User can create or select contractor contact on step 4
The system SHALL present wizard step 4 (виконавець) with the same select-or-create behavior and field schema as step 3 (FR-09, FR-10). On successful confirm, the system SHALL persist to the same contacts catalog and store a full snapshot on the session as `done-by`.

#### Scenario: Create or select contractor
- **WHEN** a user on step 4 creates or selects a contact and confirms «Далі»
- **THEN** the catalog file for that `inn` is present/updated and the session `done-by` snapshot matches the confirmed fields (TC-13)

#### Scenario: Incomplete contractor blocks Next
- **WHEN** any required contractor field is empty on step 4
- **THEN** «Далі» does not advance the wizard

### Requirement: Contacts are keyed uniquely by РНОКПП
The system SHALL use trimmed `inn` (РНОКПП) as the unique contact identifier and filename under `{data-root}/contacts/` (NFR-05, NFR-12, BC-05). Updating a contact with the same `inn` SHALL overwrite the same file. Different `full-name` values with the same `inn` SHALL be treated as one contact (last write wins). JSON keys SHALL use kebab-case as in FR-10 (NFR-13).

#### Scenario: Update overwrites same file
- **WHEN** a contact with a given `inn` already exists and the user saves changed fields for that same `inn`
- **THEN** `{data-root}/contacts/{inn}.json` is overwritten and no second file is created for that `inn`

### Requirement: Contact without РНОКПП cannot be saved
The system SHALL reject saving a contact when `inn` is missing or blank after trim, both in the step UI and in the contacts API (TC-26). Save or persistence failures SHALL be shown to the user; the wizard MUST NOT advance on failure (NFR-10).

#### Scenario: Empty РНОКПП blocked on step
- **WHEN** a user attempts to confirm step 3 or 4 with an empty `inn`
- **THEN** the contact is not written, the session snapshot for that role is not treated as successfully saved, and the user remains on the current step (TC-26)

#### Scenario: Persistence failure stays on step
- **WHEN** writing the catalog file or patching the session fails after the user confirms
- **THEN** the user sees an error and the wizard remains on the current step

### Requirement: Session contact snapshots survive reload
The system SHALL restore step 3 or 4 with the session’s `client` or `done-by` snapshot when present after reload or «Назад», without creating a new session `guid` (NFR-04).

#### Scenario: Reload on step 4 keeps contractor snapshot
- **WHEN** a user has confirmed step 4 (`done-by` set) and reloads `/docs/{guid}` while still on step 4 or returns to it
- **THEN** the same `guid` and `done-by` fields are restored
