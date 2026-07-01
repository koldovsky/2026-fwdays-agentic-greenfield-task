# Supplier and Inventory Master Data Specification

## Purpose

Expose operational reference data while protecting administrative mutations. Covers FR-14 through FR-17.

## Requirements

### Requirement: Supplier administration

An Admin SHALL list and create validated supplier profiles (FR-14).

#### Scenario: Valid supplier
- **GIVEN** a signed-in Admin and unique supplier data
- **WHEN** company, contact, lead time, and rating are submitted
- **THEN** the supplier is persisted and appears in the supplier list

#### Scenario: Invalid supplier
- **GIVEN** missing contact data, negative lead time, or a rating outside 0 through 5
- **WHEN** creation is attempted
- **THEN** field-specific errors appear and no supplier is written

### Requirement: Protected supplier changes

Staff SHALL be unable to mutate supplier data (FR-15).

#### Scenario: Staff submission
- **GIVEN** a Staff session
- **WHEN** supplier creation is submitted directly
- **THEN** the service rejects it and data remains unchanged

### Requirement: Inventory visibility and administration

Authenticated users SHALL list item details, while only Admin may update reorder levels and raw-material status (FR-16, FR-17).

#### Scenario: Admin updates material settings
- **GIVEN** a valid material and Admin session
- **WHEN** a non-negative threshold and allowed status are submitted
- **THEN** the updated settings persist

#### Scenario: Invalid inventory setting
- **GIVEN** a negative threshold or unknown stock status
- **WHEN** an update is attempted
- **THEN** an inline validation error is returned and no change persists

