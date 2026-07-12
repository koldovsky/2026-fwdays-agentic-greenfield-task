# Delta: export-share (add-export-share-preview)

Preview gate only — FR-EXPORT-04, FR-EXPORT-05, and TC-PDF-01 remain unchanged
(proposed; shipped in a future pdf change).

## MODIFIED Requirements

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

## ADDED Requirements

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
