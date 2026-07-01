# Dashboard and Navigation Specification

## Purpose

Give authenticated operators immediate financial and stock-risk visibility with clear navigation. Covers FR-8 through FR-13 and NFR-7 through NFR-10.

## Requirements

### Requirement: Inventory valuation

The dashboard SHALL calculate raw-material and finished-goods values from current quantity multiplied by unit price (FR-8, FR-9).

#### Scenario: Seeded valuation
- **GIVEN** the supplied inventory datasets
- **WHEN** the dashboard is rendered
- **THEN** each valuation equals the sum of all current item values in its dataset

### Requirement: Pending-order valuation

The dashboard SHALL total orders whose status is neither Received nor Closed (FR-10).

#### Scenario: Mixed order statuses
- **GIVEN** Ordered, Partially Received, Received, and Closed orders
- **WHEN** pending value is calculated
- **THEN** only Ordered and Partially Received order values contribute

### Requirement: Reorder warnings

The dashboard SHALL show all items at or below their reorder threshold and distinguish Healthy, Low, and Critical using text as well as color (FR-11, FR-12).

#### Scenario: Threshold classification
- **GIVEN** quantities above, at, below, and equal to zero relative to thresholds
- **WHEN** statuses are rendered
- **THEN** above is Healthy, positive at-or-below is Low, and zero-or-less is Critical

### Requirement: Authenticated navigation

The shared shell SHALL link Dashboard, Procurement, Manufacturing, Ledger, and logout (FR-13).

#### Scenario: Keyboard navigation
- **GIVEN** an authenticated user at a 360px or wider viewport
- **WHEN** the user navigates with a keyboard
- **THEN** every destination and logout are reachable with visible focus and no horizontal page overflow

