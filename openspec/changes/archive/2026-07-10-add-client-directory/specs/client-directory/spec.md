# Delta: client-directory (add-client-directory)

## ADDED Requirements

### Requirement: Client record fields
A client record SHALL store the fields needed to prefill the invoice template customer block: customer name, address line, email, phone, and website, with optional company and tax ID metadata.

#### Scenario: Required contact fields
- **WHEN** the user saves a client with name, address, and email
- **THEN** the stored record contains non-empty `name`, `address`, and `email` values

#### Scenario: Optional contact fields
- **WHEN** the user saves a client with phone and website provided
- **THEN** the stored record contains those values for future form prefill

#### Scenario: Template mapping readiness
- **WHEN** a saved client is loaded for prefill
- **THEN** name, address, email, phone, and website map to the invoice template placeholders `CUSTOMER_NAME`, `CUSTOMER_ADDRESS_1`, `CUSTOMER_EMAIL`, `CUSTOMER_PHONE`, and `CUSTOMER_WEBSITE` respectively

### Requirement: TC-DATA-01 Browser persistence
Client directory entries SHALL persist only in browser storage and SHALL survive a full page reload in the same browser profile.

#### Scenario: Reload preserves clients
- **WHEN** the user saves a client and reloads the application
- **THEN** the same client list and field values are available without a server round-trip

## MODIFIED Requirements

### Requirement: Client directory CRUD
The system SHALL let the user create, edit, and delete client records stored only in the browser, with each record conforming to the client record field requirements.

#### Scenario: Save client
- **WHEN** the user saves a client with required name, address, and email fields
- **THEN** the client appears in the clients page list

#### Scenario: Edit client
- **WHEN** the user edits an existing client and saves
- **THEN** the updated field values persist in browser storage

#### Scenario: Delete client
- **WHEN** the user confirms deletion of a client
- **THEN** the client is removed from browser storage and no longer appears in the list

### Requirement: Client prefill only
Client directory entries SHALL prefill the invoice form and MUST NOT define or mutate content of already-issued invoice snapshots stored by the invoice register.

#### Scenario: Prefill new invoice
- **WHEN** the user selects a client while creating a new invoice (implemented in `form-input`)
- **THEN** client fields on the form populate from the directory entry's stored values

#### Scenario: Issued invoice unchanged
- **WHEN** the user edits a client directory entry after an invoice to that client was issued
- **THEN** the issued invoice snapshot retains the customer details captured at issue time and is not updated by the directory edit
