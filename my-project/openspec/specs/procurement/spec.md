# Procurement and Receiving Specification

## Purpose

Create supplier orders and safely receive raw materials into quality inspection with full audit evidence. Covers FR-18 through FR-24.

## Requirements

### Requirement: Purchase-order creation

An authorized operator SHALL create an Ordered purchase order for existing supplier and material references using positive quantity and unit price (FR-18, FR-19).

#### Scenario: Valid order
- **GIVEN** valid references and positive values
- **WHEN** an operator submits an order
- **THEN** a unique PO number, calculated total, creation time, and Ordered status are persisted

#### Scenario: Invalid order
- **GIVEN** a missing reference or non-positive numeric value
- **WHEN** submission occurs
- **THEN** an actionable inline error is returned and no order is created

### Requirement: Order tracking

The procurement page SHALL show supplier, status, value, and remaining quantity for active and received orders (FR-20).

#### Scenario: Order list
- **GIVEN** orders in multiple receipt states
- **WHEN** the page renders
- **THEN** each row shows its calculated outstanding quantity and current status

### Requirement: Receipt validation

An authorized operator SHALL record a positive receipt no greater than the remaining ordered quantity (FR-21).

#### Scenario: Excess receipt
- **GIVEN** an order with 10 units remaining
- **WHEN** 11 units are submitted
- **THEN** the operation is rejected and all datasets remain unchanged

### Requirement: Receipt status transition

A receipt SHALL set Partially Received while a balance remains and Received with a timestamp when complete (FR-22, FR-23).

#### Scenario: Partial then complete
- **GIVEN** an Ordered line for 10 units
- **WHEN** 4 units and later 6 units are received
- **THEN** the first state is Partially Received and the second is Received with a received timestamp

### Requirement: Atomic inventory intake

Each receipt SHALL atomically update the order, increment raw stock, set its status to `quality_inspection`, and append a Purchase Order Receipt movement (FR-24).

#### Scenario: Persistence failure
- **GIVEN** a valid receipt and a failure before commit
- **WHEN** the transaction aborts
- **THEN** no participating dataset reflects a partial update

