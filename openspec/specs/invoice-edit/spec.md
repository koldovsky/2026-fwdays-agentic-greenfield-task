## Purpose

Edit and duplicate existing invoices in the browser register.

## Requirements

### Requirement: FR-EDIT-01 Edit by number
The user SHALL be able to open an existing invoice by number and edit fields allowed for its status; dependent fields SHALL recalculate.

#### Scenario: Edit draft
- **WHEN** the user opens a draft invoice
- **THEN** all editable fields are available and calculations update on change

### Requirement: FR-EDIT-02 Duplicate invoice
The user SHALL be able to duplicate an invoice with a new number and date while copying client and service data.

#### Scenario: Duplicate flow
- **WHEN** the user duplicates an existing invoice
- **THEN** a new draft is created with a fresh invoice number and today's date defaults
