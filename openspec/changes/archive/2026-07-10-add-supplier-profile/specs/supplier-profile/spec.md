# Delta: supplier-profile (add-supplier-profile)

## ADDED Requirements

### Requirement: FR-BANK-02 Supplier profile fields
A supplier profile SHALL hold bilingual supplier name and address (English and Ukrainian), individual tax ID (ІПН), bank name, SWIFT/BIC code, and separate IBAN values for USD and EUR invoices.

#### Scenario: Profile completeness
- **WHEN** the user saves a supplier profile with all required fields populated
- **THEN** the stored record contains `nameEn`, `nameUa`, `addressEn`, `addressUa`, `taxId`, `bankName`, `swift`, `ibanUsd`, and `ibanEur`

#### Scenario: Both currency IBANs available
- **WHEN** a saved profile is loaded for downstream invoice generation
- **THEN** both USD and EUR IBAN values are readable from that profile without additional user input

### Requirement: NFR-SEC-01 No committed secrets
Supplier tax ID and IBAN values MUST NOT be hardcoded in the repository or compiled client bundle; only user-entered values or clearly fake development-only helpers MAY exist in browser storage at runtime.

#### Scenario: Empty install
- **WHEN** a fresh install loads without user data
- **THEN** no real tax IDs or IBANs appear in compiled JavaScript assets

#### Scenario: Build audit
- **WHEN** the production client bundle is built from a clean checkout
- **THEN** scanning static chunks finds no committed production tax IDs or IBAN literals

### Requirement: TC-DATA-01 Browser persistence
Supplier profiles SHALL persist only in browser storage (localStorage or equivalent client store) and SHALL survive a full page reload in the same browser profile.

#### Scenario: Reload preserves profiles
- **WHEN** the user saves a supplier profile and reloads the application
- **THEN** the same profile list and field values are available without a server round-trip

### Requirement: Active supplier profile
The system SHALL track one active supplier profile id in browser storage and expose it to UI consumers (settings and future invoice form).

#### Scenario: Set active profile
- **WHEN** the user selects a profile as active in Settings
- **THEN** subsequent reads of the active profile return that profile's FR-BANK-02 fields

#### Scenario: Delete active profile
- **WHEN** the user deletes the currently active profile
- **THEN** the active pointer clears or moves to another remaining profile without leaving a dangling id

## MODIFIED Requirements

### Requirement: Supplier profile storage
The system SHALL let the user create, edit, and delete supplier profiles stored only in the browser, with each profile conforming to FR-BANK-02 field requirements.

#### Scenario: Save supplier
- **WHEN** the user saves a new supplier profile with all required FR-BANK-02 fields
- **THEN** it appears in the supplier profile list and in the profile dropdown component

#### Scenario: Edit supplier
- **WHEN** the user edits an existing supplier profile and saves
- **THEN** the updated FR-BANK-02 fields persist in browser storage

#### Scenario: Delete supplier
- **WHEN** the user confirms deletion of a supplier profile
- **THEN** the profile is removed from browser storage and no longer appears in the dropdown

### Requirement: Multiple supplier profiles
The system SHALL support multiple supplier profiles without authentication; this is local profile switching for one browser user, not multi-tenancy or hosted accounts.

#### Scenario: Switch supplier
- **WHEN** the user selects a different supplier from the profile dropdown
- **THEN** the active profile pointer updates to that profile's saved FR-BANK-02 fields

#### Scenario: Multiple saved profiles
- **WHEN** the user creates more than one supplier profile
- **THEN** all profiles remain listed and individually editable without overwriting each other

### Requirement: No committed secrets
Supplier tax ID and IBAN values MUST NOT be hardcoded in the repository or client bundle; only user-entered or clearly fake demo-seed data in browser storage.

#### Scenario: Empty install
- **WHEN** a fresh install loads without user data
- **THEN** no real tax IDs or IBANs ship in compiled assets and the profile list is empty
