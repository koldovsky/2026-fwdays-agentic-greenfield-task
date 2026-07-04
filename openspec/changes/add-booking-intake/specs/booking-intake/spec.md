## ADDED Requirements

### Requirement: Mahogany HOA provider selection
The booking intake SHALL present **Mahogany HOA** as the only selectable provider in MVP (FR-PROV-01).

#### Scenario: Provider displayed on load
- **WHEN** a visitor opens the booking intake page
- **THEN** Mahogany HOA is shown as the active provider
- **AND** no other providers are selectable

### Requirement: Outdoor facility type selection
The intake SHALL allow selecting **Tennis Courts** or **Beach Picnic Sites** (FR-PROV-02).

#### Scenario: Tennis selected
- **WHEN** the visitor selects Tennis Courts
- **THEN** the form indicates tennis as the active facility type
- **AND** picnic-specific copy is hidden

#### Scenario: Picnic selected
- **WHEN** the visitor selects Beach Picnic Sites
- **THEN** the form indicates picnic as the active facility type

#### Scenario: Unbookable facility explained
- **WHEN** the visitor views facility options
- **THEN** volleyball, amphitheatre, and other non-bookable MHOA outdoor amenities are not offered
- **AND** unavailable types are not silently omitted without explanation where listed (FR-PROV-03)

### Requirement: Full name capture
The intake SHALL collect the resident's **full name** as a required field (FR-INPUT-07).

#### Scenario: Missing full name
- **WHEN** the visitor submits with an empty full name
- **THEN** a field-specific error is shown
- **AND** the form does not advance to the confirm step

### Requirement: Email capture
The intake SHALL collect a required **email** with valid format (FR-INPUT-01).

#### Scenario: Invalid email
- **WHEN** the visitor enters a malformed email address
- **THEN** a field-specific error is shown
- **AND** the form does not advance

#### Scenario: Valid email
- **WHEN** the visitor enters a well-formed email
- **THEN** no email validation error is shown

### Requirement: Phone number capture
The intake SHALL collect a required **phone number** in a North-American format suitable for MHOA forms (FR-INPUT-02).

#### Scenario: Missing phone
- **WHEN** the visitor leaves phone empty
- **THEN** a field-specific error is shown

#### Scenario: Invalid phone format
- **WHEN** the visitor enters fewer than 10 digits
- **THEN** a field-specific error explains the expected format

### Requirement: Resident address capture
The intake SHALL collect a required **Mahogany resident address** (FR-INPUT-03).

#### Scenario: Missing address
- **WHEN** the visitor leaves address empty
- **THEN** a field-specific error is shown

### Requirement: Natural-language booking request
The intake SHALL collect a required **natural-language booking request** of at least 10 characters (FR-INPUT-04).

#### Scenario: Request too short
- **WHEN** the visitor enters fewer than 10 characters in the request field
- **THEN** a field-specific error is shown

#### Scenario: Valid request
- **WHEN** the visitor enters at least 10 characters describing when and what to book
- **THEN** no length validation error is shown

### Requirement: Client-side validation gate
All required fields SHALL be validated in the browser before showing the confirm step (FR-INPUT-05).

#### Scenario: Multiple invalid fields
- **WHEN** the visitor submits with several invalid fields
- **THEN** each invalid field shows its own error message
- **AND** focus moves to the first invalid field

### Requirement: Confirm step UI shell
After valid intake submission, the app SHALL display a **confirm step** showing captured contact fields and a structured booking preview placeholder (FR-INPUT-06 partial).

#### Scenario: Confirm step shows captured data
- **WHEN** the visitor passes validation and proceeds
- **THEN** full name, email, phone, address, facility type, and NL request are displayed for review
- **AND** a parsed-intent section shows placeholder values until NLP is implemented
- **AND** a final “Submit to MHOA” action remains disabled with explanation

### Requirement: Automation disclosure
The intake SHALL disclose that confirmed bookings will be submitted to mahoganyhoa.com on the resident's behalf (NFR-LEGAL-01).

#### Scenario: Disclosure visible before confirm
- **WHEN** the visitor views the booking intake form
- **THEN** text explains the service automates MHOA form submission
- **AND** the resident attests to rule compliance via checkbox or equivalent before proceeding

### Requirement: Accessible form controls
All intake fields SHALL have associated labels, visible focus indicators, and errors linked to inputs (NFR-A11Y-01).

#### Scenario: Keyboard navigation
- **WHEN** the visitor tabs through the form
- **THEN** each interactive control receives a visible focus indicator

#### Scenario: Error association
- **WHEN** a field validation error is shown
- **THEN** the error is programmatically associated with the input (aria-describedby or equivalent)
