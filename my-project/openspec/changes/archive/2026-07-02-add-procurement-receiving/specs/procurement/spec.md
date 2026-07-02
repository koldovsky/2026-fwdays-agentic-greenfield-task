## ADDED Requirements

### Requirement: Verified procurement lifecycle

ForgeFlow SHALL create valid supplier orders, show their calculated state, reject invalid receipts, and transition partial and complete receipts atomically into inventory and the movement ledger (FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24).

#### Scenario: Create, partially receive, and complete

- **WHEN** dedicated tests and the extended browser proof execute the lifecycle
- **THEN** order totals, statuses, received quantities, quality state, timestamps, and receipt movement remain consistent
