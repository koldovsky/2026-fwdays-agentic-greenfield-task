## Purpose

Wizard step 2: set document date and issue invoice/act numbers from yearly counters under the data root (FR-05, FR-06, FR-07, NFR-04, NFR-06, NFR-10, NFR-12).

## Requirements

### Requirement: User can set document date on step 2
The system SHALL present wizard step 2 with an editable document date. New sessions SHALL default `date` to the current calendar day in ISO `YYYY-MM-DD` form. The user SHALL be allowed to change the date before confirming the step (FR-05). A valid date SHALL be required before advancing with «Далі».

#### Scenario: Default date is today when left unchanged
- **WHEN** a user opens step 2 of a newly created session and does not change the date
- **THEN** the session `date` equals today’s date (TC-07)

#### Scenario: User edits the date
- **WHEN** a user on step 2 sets the date to a different valid calendar day and the change is saved
- **THEN** the session `date` reflects that day

#### Scenario: Invalid date blocks Next
- **WHEN** the date on step 2 is missing or invalid
- **THEN** «Далі» does not advance the wizard

### Requirement: System issues invoice and act numbers by document type
The system SHALL issue document numbers on step-2 confirm according to session `doc-type` (FR-06, BC-06):
- Invoice number format: prefix `Р-` followed by exactly seven decimal digits (zero-padded), e.g. `Р-0000001`
- Act number format: a positive decimal integer string with no prefix, e.g. `1`
- `invoice_act` requires both invoice and act numbers
- `invoice` requires only an invoice number
- `act` requires only an act number

Numbers SHALL be stored on the session as `invoice-number` and/or `act-number`.

#### Scenario: First invoice of the year
- **WHEN** a session that needs an invoice confirms step 2 for a year with no prior invoice issues (counter at 0 or missing file)
- **THEN** `invoice-number` is `Р-0000001` and that year’s counter is updated (TC-08)

#### Scenario: Next invoice same year
- **WHEN** another session that needs an invoice confirms step 2 for the same year after `Р-0000001` was issued
- **THEN** `invoice-number` is `Р-0000002` (or the next sequence value) (TC-09)

#### Scenario: Invoice plus act both issued
- **WHEN** a session with `doc-type` `invoice_act` confirms step 2 and both numbers are missing
- **THEN** both `invoice-number` and `act-number` are set from that year’s counters

#### Scenario: Invoice-only skips act number
- **WHEN** a session with `doc-type` `invoice` confirms step 2
- **THEN** `invoice-number` is set and `act-number` remains unset

#### Scenario: Act-only skips invoice number
- **WHEN** a session with `doc-type` `act` confirms step 2
- **THEN** `act-number` is set and `invoice-number` remains unset

### Requirement: Yearly counters persist under the data root
The system SHALL store the last issued sequences in `{data-root}/{year}/doc_number.json`, where `year` is the calendar year of the session document `date` at issue time (FR-07, NFR-06, NFR-12). Different years SHALL use independent counter files. Counter updates for a year SHALL be atomic within a single app process so concurrent issues do not lose increments (NFR-06).

#### Scenario: Other year uses its own counter file
- **WHEN** a session confirms step 2 with a document date in a different calendar year than prior issues
- **THEN** the system reads and updates `./{that-year}/doc_number.json` under the data root, not the other year’s file (TC-10)

#### Scenario: Missing counter file initializes
- **WHEN** the counter file for the document year does not exist and numbers are issued
- **THEN** the file is created and sequences start from 1 for the issued kinds

### Requirement: Assigned numbers stay stable on reload and Back
The system SHALL NOT reissue `invoice-number` or `act-number` when they are already present on the session for a needed kind, including on page reload, «Назад» to step 2, or a second confirm of step 2 (NFR-04). Save or issue failures SHALL be shown to the user and MUST NOT present success or advance the step (NFR-10).

#### Scenario: Reload keeps numbers
- **WHEN** a user has confirmed step 2 (numbers assigned) and reloads `/docs/{guid}`
- **THEN** the same `guid`, `date`, and document numbers are restored without incrementing counters

#### Scenario: Back to step 2 does not re-issue
- **WHEN** a user returns from a later step to step 2 with numbers already on the session and confirms again
- **THEN** the displayed numbers are unchanged and yearly counters are not incremented for those kinds

#### Scenario: Issue failure stays on step 2
- **WHEN** persisting the date or issuing numbers fails
- **THEN** the user sees an error, the wizard remains on step 2, and counters are not left claiming a successful issue without matching session fields
