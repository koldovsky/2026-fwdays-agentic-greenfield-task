## Purpose

HTML preview, PDF download, print, and share surfaces for generated invoices.

## Requirements

### Requirement: FR-EXPORT-01 HTML preview
The user SHALL see an HTML preview of the generated invoice in the browser before
export, and SHALL have access to preview-gate export actions when preview HTML is
available.

#### Scenario: Live preview
- **WHEN** required form fields are valid and supplier banking data is complete for the selected currency
- **THEN** the preview updates to show the rendered bilingual invoice document

#### Scenario: Preview empty before valid state
- **WHEN** required form fields are missing or fail validation
- **THEN** the preview surface shows guidance text and export actions are disabled

#### Scenario: Export actions enabled
- **WHEN** the preview displays rendered invoice HTML without a render error
- **THEN** HTML download and print actions are enabled in the preview chrome

#### Scenario: Export actions disabled on render error
- **WHEN** preview generation fails (for example missing IBAN for the selected currency)
- **THEN** export actions remain disabled and the existing error message is shown

### Requirement: FR-EXPORT-02 HTML download
The system SHALL let the user download the current preview HTML as a standalone
`.html` file that opens offline with embedded styles and the same document content
as the live preview.

#### Scenario: Successful download
- **WHEN** the user activates HTML download while preview HTML is available
- **THEN** the browser saves a file named with the preview invoice number and `.html` extension containing the full rendered document

#### Scenario: Self-contained markup
- **WHEN** the user opens the downloaded `.html` file without network access
- **THEN** invoice layout and typography render correctly without requesting the app origin

#### Scenario: Download blocked without preview
- **WHEN** preview HTML is not available
- **THEN** the download action is disabled and does not create a file

### Requirement: FR-EXPORT-03 Browser print A4
The system SHALL let the user print the current preview document from the browser
with A4-oriented page layout suitable for the invoice template.

#### Scenario: Print dialog opens
- **WHEN** the user activates print while preview HTML is available
- **THEN** the browser print dialog opens targeting the invoice document content

#### Scenario: A4 layout
- **WHEN** the user prints the preview document
- **THEN** the printed output uses A4 page sizing without horizontal overflow of the invoice body

#### Scenario: Print blocked without preview
- **WHEN** preview HTML is not available
- **THEN** the print action is disabled and does not open a print dialog

### Requirement: FR-EXPORT-04 Stateless PDF download
The system SHALL provide PDF download via stateless `POST /api/pdf` that renders the same content as the HTML preview.

#### Scenario: PDF matches preview
- **WHEN** the user requests PDF export with the current invoice payload
- **THEN** the server returns `application/pdf` without persisting the payload

### Requirement: FR-EXPORT-05 Share PDF
The user SHALL be able to share the PDF via file download or Web Share API where the browser supports it.

#### Scenario: Download fallback
- **WHEN** Web Share API is unavailable
- **THEN** the user can still save the PDF file locally

### Requirement: TC-PDF-01 No server retention
The PDF route SHALL NOT store invoice data at rest, including logs, caches, or temporary files beyond the request lifecycle.

#### Scenario: Stateless render
- **WHEN** `POST /api/pdf` completes
- **THEN** no invoice fields remain in server memory or storage after the response is sent
