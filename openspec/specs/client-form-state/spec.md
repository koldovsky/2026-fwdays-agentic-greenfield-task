## Purpose

Defines how client-side forms (the manager configurator form and the admin add/edit dialogs) manage field state and validation through a shared form library (`@tanstack/react-form`), and how server-originated validation/conflict errors stay distinct from client-side field errors.

## Requirements

### Requirement: Forms manage field state and validation through a shared form library
Client-side forms that collect user input for configuration submission or dictionary/catalog CRUD (the manager configurator form and the admin add/edit dialogs) SHALL manage field values and client-side validation through `@tanstack/react-form`'s `useForm`, rather than one `useState` call per field with manual `onChange` handlers.

#### Scenario: Required field blocks submission until filled
- **WHEN** a user attempts to submit a form with a required field left empty (e.g. a new dictionary item's name)
- **THEN** the form SHALL prevent submission and indicate the field is invalid, without issuing a request to the server

#### Scenario: Numeric size fields validate range client-side
- **WHEN** a manager enters a top or bottom size value in the configurator form
- **THEN** the form SHALL validate it client-side (e.g. numeric, non-negative) before allowing submission, consistent with existing field-level validation behavior

### Requirement: Server-side validation and conflict errors remain distinct from field errors
Errors returned by the server (BOM validation errors keyed by part role, or a 409 duplicate-catalog-entry conflict) SHALL continue to be surfaced separately from form field validation errors, matching current behavior where field errors and submission errors are shown in different UI locations.

#### Scenario: BOM validation error from the server is shown per part, not as a form field error
- **WHEN** the server rejects a configuration submission with part-specific BOM errors
- **THEN** each error is displayed next to its corresponding part-size field, sourced from the mutation response rather than from `@tanstack/react-form` field validators

#### Scenario: Duplicate catalog entry conflict is shown as a submission-level message
- **WHEN** a manager attempts to save a configuration that already matches an existing catalog entry (`409` response)
- **THEN** the UI shows the existing matching entry's SKU as a submission-level message, not as a form field error
