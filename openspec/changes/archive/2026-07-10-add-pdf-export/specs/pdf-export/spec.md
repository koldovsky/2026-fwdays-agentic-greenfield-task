## ADDED Requirements

### Requirement: Final step shows read-only documents with PDF download
The system SHALL present wizard step 7 (and completed-session final review) as a read-only view of the filled documents required by `doc-type` (`invoice` → invoice only; `act` → act only; `invoice_act` → both). For each shown document the user SHALL be able to download a PDF. Document HTML content MUST NOT be editable inline on this step (BC-12, FR-15).

#### Scenario: Download invoice PDF
- **WHEN** a user on the final view for a session that includes an invoice activates download for the invoice
- **THEN** a PDF file is downloaded with A4 layout derived from the filled invoice HTML (TC-17)

#### Scenario: Download act PDF
- **WHEN** a user on the final view for a session that includes an act activates download for the act
- **THEN** a PDF file is downloaded with A4 layout derived from the filled act HTML (TC-17)

#### Scenario: invoice_act offers both PDFs
- **WHEN** a user on the final view has `doc-type` `invoice_act`
- **THEN** download actions are available for both invoice and act

#### Scenario: Final view is not editable
- **WHEN** a user views step 7 or completed final review
- **THEN** document HTML content cannot be edited inline; only navigation and download actions apply (BC-12)

### Requirement: PDF matches filled HTML templates
The system SHALL generate each PDF from the same filled HTML produced by the `template-fill` pipeline for that session and type, rendered to A4 so the PDF visually corresponds to the HTML templates (NFR-07).

#### Scenario: PDF uses filled invoice HTML
- **WHEN** the system generates an invoice PDF for a session
- **THEN** the PDF is rendered from filled `invoce.html` content for that session (not a separate layout)

#### Scenario: PDF uses filled act HTML
- **WHEN** the system generates an act PDF for a session
- **THEN** the PDF is rendered from filled `complete.html` content for that session

### Requirement: PDF API returns downloadable PDF
The system SHALL expose `GET /api/docs/[guid]/pdf?type=invoice|act` that returns `application/pdf` for the requested type when the session exists and `doc-type` includes that document. A missing session SHALL yield a clear not-found error. A type not included by `doc-type` SHALL be rejected. Generation failures SHALL be surfaced as errors the client can show (NFR-10).

#### Scenario: PDF invoice for valid session
- **WHEN** a client requests PDF with `type=invoice` for a session that includes an invoice
- **THEN** the response is an `application/pdf` body for the filled invoice

#### Scenario: Reject act PDF for invoice-only session
- **WHEN** a client requests PDF with `type=act` for a session with `doc-type` `invoice`
- **THEN** the request is rejected without returning act PDF

#### Scenario: Missing session for PDF
- **WHEN** a client requests PDF for a well-formed `guid` with no session file
- **THEN** the system returns a clear not-found error

### Requirement: Back from final step preserves data
The system SHALL allow returning from the final view to step 6 with all session document data preserved (FR-15, TC-18). After return, `completed` SHALL be false and `current-step` SHALL be 6.

#### Scenario: Back from step 7 to step 6
- **WHEN** a user on the final view activates «Назад»
- **THEN** the wizard shows step 6 with the same contacts, numbers, services, and other session fields unchanged (TC-18)

### Requirement: Edit returns user to the creation flow
The system SHALL provide «Редагувати» on the final review that re-enters the wizard flow without discarding session data (FR-16, TC-19). Activating «Редагувати» SHALL set `completed` to false and `current-step` to 6 so the user can navigate further with «Назад» / «Далі».

#### Scenario: Edit from final review
- **WHEN** a user on completed final review activates «Редагувати»
- **THEN** the session is no longer treated as completed final-only and the wizard opens on step 6 with saved data intact (TC-19)
