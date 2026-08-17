## Why

Invoice and act templates need Ukrainian amount-in-words and date-in-words strings (FR-20, FR-21). These pure helpers have no UI or filesystem dependencies, so they can ship first with fixed PRD examples and be imported later by `template-fill`.

## What Changes

- Add a `locale-helpers` module with pure functions:
  - `amountToCursive(n)` — sum in Ukrainian words with гривня/копійки
  - `dateToNumeric(d)` — `DD.MM.YYYY`
  - `dateToCursive(d)` — day + Ukrainian month name + year + `р.`
- Add unit tests covering TC-22 and TC-23 (and a small set of edge cases needed for correctness)
- No UI, routes, or persistence in this change

## Capabilities

### New Capabilities
- `locale-helpers`: Ukrainian locale formatting for money and dates used in document templates

### Modified Capabilities
- _(none)_

## Impact

- New TypeScript module (likely under `src/lib/` or similar once the app scaffold exists; standalone module is fine if scaffold is not yet present)
- Test runner / unit test files for the helpers
- Downstream consumers: `template-fill` (phase 8); no other capabilities depend on this yet
- Non-goals (BC-02, BC-03, BC-08): no auth, no e-document exchange, no legal compliance guarantees
- Scope limit (BC-10, BC-13): Ukrainian + UAH only; formats locked to PRD examples
