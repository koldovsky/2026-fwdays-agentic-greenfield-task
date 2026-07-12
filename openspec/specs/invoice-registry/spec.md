## Purpose

Browser-side invoice register with manual statuses and immutable issued snapshots.
## Requirements
### Requirement: FR-REG-01 Stored invoice statuses
The system SHALL persist invoice status as one of `draft`, `sent`, `paid`, or `cancelled` set manually by the user.

#### Scenario: Mark sent
- **WHEN** the user marks a draft invoice as sent
- **THEN** the stored status becomes `sent` without any email integration

### Requirement: FR-REG-02 Derived overdue display
The system SHALL derive `overdue` for display when status is `sent` and the payment deadline date is before today; overdue MUST NOT be stored.

#### Scenario: Overdue badge
- **WHEN** an invoice is `sent` and the payment deadline was yesterday
- **THEN** the derivation returns overdue while the stored status remains `sent`

#### Scenario: Overdue never persisted
- **WHEN** any invoice record is saved and read back
- **THEN** the stored record carries no `overdue` field — it is computed on demand

### Requirement: FR-REG-03 Issued invoice snapshot
An issued invoice record SHALL store a snapshot of all fields printed on the document; editing supplier or client directories MUST NOT alter past invoice snapshots.

#### Scenario: IBAN change isolation
- **WHEN** the user updates a supplier IBAN after issuing an invoice
- **THEN** previously issued invoices still show the IBAN from their snapshot

### Requirement: TC-DATA-01 Browser persistence
The invoice register SHALL persist in browser storage (localStorage or IndexedDB) with no server-side copy.

#### Scenario: Reload preserves register
- **WHEN** the user reloads the app in the same browser
- **THEN** previously saved invoices are still listed

