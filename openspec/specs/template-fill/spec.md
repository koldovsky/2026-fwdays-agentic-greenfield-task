## Purpose

Fill invoice and act HTML templates from a document session snapshot, expose a preview API, and show read-only filled previews on wizard step 6 (FR-13, FR-14, NFR-10, NFR-12, NFR-13, BC-07).

## Requirements

### Requirement: System fills invoice template from session
The system SHALL fill `./templates/invoce.html` (BC-07 filename) using the document session snapshot so that invoice anchors required by FR-13 are populated: customer (`client-*`), contractor (`done-by-*`), `amount-cursive`, `date`, `date-cursive`, `service-cursive`, `done_amount`, `price`, and `price-total`. JSON/CSS anchor names SHALL remain kebab-case except the PRD exception `done_amount` (NFR-13). Model field `amount` on each service line SHALL map to the quantity / `done_amount` slot. Templates SHALL be read from project `./templates/` (NFR-12).

#### Scenario: Invoice preview anchors filled
- **WHEN** a session has client, done-by, date, invoice number, and one or more service lines and the system produces the invoice HTML preview
- **THEN** `client-*`, `done-by-*`, `amount-cursive`, `date`, `date-cursive`, `service-cursive`, `done_amount`, `price`, and `price-total` values are present in the filled HTML (TC-15)

#### Scenario: Invoice filename remains invoce.html
- **WHEN** the system loads the invoice template
- **THEN** it reads `./templates/invoce.html` without requiring a renamed `invoice.html` file (BC-07)

### Requirement: System fills act template from session
The system SHALL fill `./templates/complete.html` using the document session snapshot so that act anchors required by FR-14 are populated: customer (`client-*`), contractor (`done-by-*`), and `amount-cursive`.

#### Scenario: Act preview anchors filled
- **WHEN** a session has client, done-by, and service lines that yield a total, and the system produces the act HTML preview
- **THEN** `client-*`, `done-by-*`, and `amount-cursive` values are present in the filled HTML (TC-16)

### Requirement: price-total equals sum of line products
The system SHALL compute `price-total` as the sum of `amount × price` over all session `services` lines (TC-24). `amount-cursive` for the document SHALL be derived from that same total via `amountToCursive`.

#### Scenario: price-total matches line math
- **WHEN** a session has service lines with known `amount` and `price` values
- **THEN** the filled invoice’s `price-total` equals Σ(`amount × price`) for those lines (TC-24)

#### Scenario: amount-cursive uses the same total
- **WHEN** `price-total` is computed for a session
- **THEN** `amount-cursive` in filled invoice (and act) HTML matches `amountToCursive(price-total)`

### Requirement: Multi-line services appear in the table
The system SHALL clone the template service row for each session service line and fill per-line name, quantity (`amount` / `done_amount`), unit price, and line sum (`amount × price`).

#### Scenario: Two services render two rows
- **WHEN** a session has two service lines and invoice HTML is filled
- **THEN** the items table contains two data rows reflecting both lines’ names, quantities, prices, and line sums

### Requirement: Step 6 shows read-only HTML preview by document type
The system SHALL present wizard step 6 as a read-only preview of filled HTML for the documents required by `doc-type` (`invoice` → invoice only; `act` → act only; `invoice_act` → both). The user MUST NOT edit template content inline on this step. Advancing «Далі» SHALL persist `current-step` to 7 without altering filled document fields. Preview failures or missing templates SHALL be shown to the user (NFR-10).

#### Scenario: invoice_act shows both previews
- **WHEN** a user on step 6 has `doc-type` `invoice_act`
- **THEN** both invoice and act filled previews are available (TC-05)

#### Scenario: invoice-only shows invoice preview
- **WHEN** a user on step 6 has `doc-type` `invoice`
- **THEN** the invoice preview is shown and the act preview is not required (TC-04)

#### Scenario: Preview is not editable
- **WHEN** a user views step 6
- **THEN** document HTML content cannot be edited inline; only wizard navigation applies

#### Scenario: Next advances to step 7
- **WHEN** a user on step 6 activates «Далі» and the session save succeeds
- **THEN** `current-step` becomes 7

### Requirement: Preview API returns filled HTML
The system SHALL expose `GET /api/docs/[guid]/preview?type=invoice|act` that returns filled HTML for the requested type when the session exists and `doc-type` includes that document. A missing session SHALL yield a clear not-found error. A type not included by `doc-type` SHALL be rejected.

#### Scenario: Preview invoice HTML for valid session
- **WHEN** a client requests preview with `type=invoice` for a session that includes an invoice
- **THEN** the response is filled invoice HTML derived from `invoce.html`

#### Scenario: Reject act preview for invoice-only session
- **WHEN** a client requests preview with `type=act` for a session with `doc-type` `invoice`
- **THEN** the request is rejected without returning act HTML
