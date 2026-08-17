## ADDED Requirements

### Requirement: User can choose document type on step 1
The system SHALL let the user select the document type on wizard step 1 as one of: `invoice_act` (labeled «Рахунок + акт»), `invoice` («Рахунок»), or `act` («Акт») (FR-03). New sessions SHALL default to `invoice_act`. The selected value SHALL be stored in the session field `doc-type`. MVP document kinds are limited to invoice and act for FOP↔FOP service flows (BC-01).

#### Scenario: Default type is invoice plus act
- **WHEN** a user opens a newly created unfinished session on step 1
- **THEN** `doc-type` is `invoice_act` and the «Рахунок + акт» option is selected

#### Scenario: User selects invoice only
- **WHEN** a user on step 1 chooses «Рахунок» and the choice is saved
- **THEN** the session `doc-type` is `invoice` (TC-04)

#### Scenario: User selects invoice plus act
- **WHEN** a user on step 1 chooses «Рахунок + акт» and the choice is saved
- **THEN** the session `doc-type` is `invoice_act` (TC-05)

#### Scenario: User selects act only
- **WHEN** a user on step 1 chooses «Акт» and the choice is saved
- **THEN** the session `doc-type` is `act`

#### Scenario: Reload keeps selected type
- **WHEN** a user changes `doc-type` on step 1 and reloads `/docs/{guid}`
- **THEN** the same `doc-type` is restored without creating a new guid (NFR-03, NFR-04)

### Requirement: Document type persists before leaving step 1
The system SHALL persist `doc-type` through the document-session update path so advancing with «Далі» does not lose the selection. Save failures SHALL be shown to the user and MUST NOT present a successful type change (NFR-10).

#### Scenario: Next keeps type on step 2
- **WHEN** a user selects `invoice` on step 1 and activates «Далі»
- **THEN** the wizard moves to step 2 and the session still has `doc-type` `invoice`

#### Scenario: Type save failure stays on step 1
- **WHEN** persisting `doc-type` fails
- **THEN** the user sees an error and the UI does not claim the new type was saved

### Requirement: User can copy data from an existing session guid
The system SHALL allow the user on step 1 to enter another session `guid` and copy that session’s data into the current session, excluding document numbers (FR-04). Copied fields SHALL include at least `doc-type`, `date`, `client`, `done-by`, and `services` when present on the source. The target session SHALL NOT receive `invoice-number` or `act-number` from the source; any existing numbers on the target SHALL be cleared so numbering can be issued anew later (BC-11). The target SHALL record `copied-from` as the source guid. The target `guid`, `current-step`, and `completed` SHALL remain unchanged.

#### Scenario: Successful copy omits numbers
- **WHEN** a user on step 1 copies from a valid source guid that has contacts, services, and document numbers
- **THEN** the current session receives the copied business fields, has no invoice/act numbers from the source, and `copied-from` equals the source guid (TC-06)

#### Scenario: Copy from missing guid fails safely
- **WHEN** a user attempts to copy from a guid that does not exist or is invalid
- **THEN** the user sees a clear error and the current session data is not partially overwritten by the failed copy

#### Scenario: Empty copy field does nothing
- **WHEN** the copy guid field is empty and the user continues without requesting a copy
- **THEN** the session is unchanged aside from any explicit `doc-type` edits
