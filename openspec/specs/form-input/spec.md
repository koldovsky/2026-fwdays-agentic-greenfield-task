## Purpose

Structured invoice form with validation and live preview trigger (no chat/LLM in MVP).

## Requirements

### Requirement: FR-INPUT-01 Full structured input
The system SHALL accept full structured input on `/invoices/new` covering: client selection or customer name, address, email, phone, website, currency (USD or EUR), service description, quantity, unit price amount, prepayment percentage, payment deadline days, execution term days, optional project name, issue date, and bilingual payment-terms prose derived from those values.

#### Scenario: Complete form submission
- **WHEN** the user fills all required structured fields with valid values
- **THEN** the system produces an invoice preview payload without server round-trips for mutation

#### Scenario: Required customer contact
- **WHEN** the user attempts preview without customer name, address, or email
- **THEN** the system blocks preview and marks the missing fields

### Requirement: FR-INPUT-02 Short key-value input
The system SHALL accept a short key-value format with keys `client`, `addr`, `email`, `phone`, `web`, `curr`, `service`, `qty`, `amount`, `prepay`, `pay_days`, `exec_days`, parsing `key: value` lines case-insensitively on keys and populating the structured form.

#### Scenario: Short format parsed
- **WHEN** the user pastes or enters the short key-value format with recognized keys
- **THEN** the form fields populate from the parsed values

#### Scenario: Unknown key ignored
- **WHEN** the short format contains a key outside the recognized set
- **THEN** the parser ignores that line and continues parsing recognized keys without failing the whole paste

### Requirement: FR-INPUT-04 Field validation
The system SHALL validate email, phone, numeric amounts, currency (USD or EUR only in MVP), and prepayment percentage (0–100 inclusive) using a shared Zod schema before preview generation.

#### Scenario: Invalid email
- **WHEN** the user enters a malformed email
- **THEN** the system shows an error explaining the problem and an example of valid format per BC-UX-01

#### Scenario: Invalid currency
- **WHEN** the user selects a currency other than USD or EUR
- **THEN** the system rejects the value before preview generation

#### Scenario: Invalid amount
- **WHEN** the user enters a unit price that is not a positive monetary amount
- **THEN** the system rejects the value and shows an example amount format such as `650` or `1,234.56`

#### Scenario: Invalid quantity
- **WHEN** the user enters a non-positive quantity
- **THEN** the system rejects the value before preview generation

### Requirement: Client directory prefill
The invoice creation form SHALL let the user select a client from the browser-stored client directory and SHALL populate customer fields from that record without mutating the directory entry.

#### Scenario: Client selected
- **WHEN** the user picks a client from the directory while creating a new invoice
- **THEN** customer name, address, email, phone, and website fields populate from the stored client values

#### Scenario: Manual override after prefill
- **WHEN** the user selects a client and then edits a prefilled customer field
- **THEN** the edited value is used for preview and the directory record is not modified

### Requirement: NACE service resolution
The form SHALL resolve a free-text service description to a NACE catalog entry using the deterministic matcher and SHALL surface ambiguous matches for explicit user choice.

#### Scenario: Confident match
- **WHEN** the user enters service text that matches exactly one catalog entry
- **THEN** the preview uses that entry's bilingual descriptions in the service row

#### Scenario: Ambiguous match
- **WHEN** the user enters service text that matches multiple catalog entries with equal top scores
- **THEN** the system prompts the user to choose among the candidates and does not silently pick the first match

#### Scenario: No match
- **WHEN** the user enters service text that matches no catalog entry
- **THEN** the system shows an error explaining that no service was recognized and asks the user to refine the description or pick manually if offered

### Requirement: Live HTML preview
The invoice creation page SHALL render a live HTML preview from validated form state by calling the document-render pipeline on the client without a server mutation round-trip.

#### Scenario: Preview updates on valid state
- **WHEN** all required fields pass validation and supplier banking data is complete for the selected currency
- **THEN** the preview panel shows the rendered bilingual invoice HTML

#### Scenario: Preview blocked on validation failure
- **WHEN** any required field fails validation
- **THEN** the preview does not render a partial invoice and field-level errors are shown

#### Scenario: Missing IBAN for currency
- **WHEN** the active supplier profile lacks an IBAN for the selected currency
- **THEN** preview generation fails with the banking module's typed error and a BC-UX-01 message naming the currency and pointing to Settings → supplier profile

### Requirement: BC-UX-01 Explain and example errors
Validation and render failures on the invoice form SHALL explain the problem in Ukrainian and show a correct example of the expected input format.

#### Scenario: Invalid phone format
- **WHEN** the user enters a phone value that fails validation
- **THEN** the error names the problem and shows an example of a valid phone format

#### Scenario: Invalid prepayment percentage
- **WHEN** the user enters a prepayment value outside 0–100
- **THEN** the error explains the allowed range and shows an example such as `50` or `50%`

### Requirement: NFR-A11Y-01 Form accessibility
The invoice creation form SHALL expose accessible labels, associate errors with fields, and allow keyboard navigation to all inputs and the preview region.

#### Scenario: Labeled inputs
- **WHEN** the form is rendered
- **THEN** every interactive field has an associated visible or programmatic label

#### Scenario: Keyboard reachability
- **WHEN** the user navigates with the keyboard only
- **THEN** focus can reach every form control and the preview panel without requiring a pointer device

### Requirement: NFR-OBS-01 Silent healthy preview path
During a normal create-invoice session with valid inputs, the browser console SHALL remain free of errors and warnings emitted by the application.

#### Scenario: Valid preview session
- **WHEN** the user completes a valid invoice form and the preview renders successfully
- **THEN** no application-thrown console errors occur during that interaction

### Requirement: FR-INPUT-03 Dropped — no chat/LLM natural-language input
**Status: dropped (post-MVP).** The system SHALL NOT expose chat or LLM natural-language invoice input in MVP; only structured form (FR-INPUT-01) and short-format paste (FR-INPUT-02) are available.

#### Scenario: Not implemented by design
- **WHEN** the user creates an invoice in MVP
- **THEN** only the structured form and short-format paste paths are available; no chat or LLM input surface is shown
