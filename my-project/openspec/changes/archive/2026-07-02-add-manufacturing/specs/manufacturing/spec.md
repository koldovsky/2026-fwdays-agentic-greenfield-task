## ADDED Requirements

### Requirement: Verified BOM execution

ForgeFlow SHALL preview BOM requirements, reject unusable or insufficient inputs with material-specific messages, and atomically consume inputs, produce output, and append movements (FR-29, FR-30, FR-31, FR-32, FR-33, FR-34).

#### Scenario: Denied and successful runs

- **WHEN** tests exercise invalid targets, quality hold, blocked stock, shortage, and a production-ready aggregate
- **THEN** denied runs leave input unchanged and valid runs create the exact inventory and movement deltas
