## ADDED Requirements

### Requirement: Verified dashboard decisions

ForgeFlow SHALL calculate inventory and pending-order value, expose every low-stock item, and communicate Healthy, Low, and Critical states with visible text (FR-8, FR-9, FR-10, FR-11, FR-12).

#### Scenario: Boundary and valuation suite

- **WHEN** seeded values, mixed order statuses, and exact reorder boundaries are evaluated
- **THEN** totals, warnings, labels, and presentation classes match the approved rules

### Requirement: Verified navigation

The authenticated shell SHALL expose all operational destinations and logout (FR-13).

#### Scenario: Server-rendered shell

- **WHEN** the shell is rendered for an authenticated administrator
- **THEN** dashboard, inventory, procurement, manufacturing, ledger, and logout are present
