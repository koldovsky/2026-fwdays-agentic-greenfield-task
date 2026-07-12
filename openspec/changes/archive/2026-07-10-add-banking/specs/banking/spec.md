## MODIFIED Requirements

### Requirement: FR-BANK-01 Currency selects IBAN
The system SHALL select the USD IBAN when currency is USD and the EUR IBAN when currency is EUR from the active supplier profile.

#### Scenario: USD invoice
- **WHEN** currency is USD and the supplier profile has a USD IBAN
- **THEN** the invoice SUPPLIER section shows the USD IBAN

#### Scenario: EUR invoice
- **WHEN** currency is EUR and the supplier profile has a EUR IBAN
- **THEN** the invoice SUPPLIER section shows the EUR IBAN

#### Scenario: Missing IBAN for requested currency
- **WHEN** the supplier profile has no IBAN (or a blank IBAN) for the requested currency
- **THEN** selection SHALL fail with a typed error naming the missing currency and pointing to Settings → supplier profile (BC-UX-01), and no partial supplier block is produced

### Requirement: FR-BANK-03 Supplier block on document
The invoice SHALL display IBAN, bank name, and SWIFT in the SUPPLIER section per `docs/invoice-template.html` placeholders. The banking module SHALL expose the supplier block as a variable map whose keys match the template placeholders exactly: `SUPPLIER_NAME_EN`, `SUPPLIER_NAME_UA`, `SUPPLIER_ADDRESS_EN`, `SUPPLIER_ADDRESS_UA`, `SUPPLIER_TAX_ID`, `SUPPLIER_BANK`, `SUPPLIER_SWIFT`, and `SUPPLIER_IBAN` (resolved for the invoice currency per FR-BANK-01).

#### Scenario: Banking on rendered invoice
- **WHEN** an invoice is rendered for EUR
- **THEN** the EUR IBAN, bank name, and SWIFT from the snapshot appear in the supplier block

#### Scenario: Supplier block variable contract
- **WHEN** the supplier block is built from a complete supplier profile and a currency
- **THEN** the returned map contains exactly the eight `SUPPLIER_*` placeholder keys with non-empty values taken from the profile, with `SUPPLIER_IBAN` resolved for the requested currency
