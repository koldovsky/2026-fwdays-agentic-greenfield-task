## ADDED Requirements

### Requirement: Verified immutable ledger projection

ForgeFlow SHALL present movements newest-first with resolved item, type, quantity, reason, document, and actor data while exposing no edit or delete behavior (FR-35, FR-36).

#### Scenario: Projection and browser proof

- **WHEN** the pure ledger suite and extended receipt recording are evaluated
- **THEN** the source sequence remains unchanged and the newest receipt is readable as a localized +24 movement
