# Design

Pure procurement operations clone the database aggregate, validate references and positive values, generate human-readable order numbers, and apply each receipt as one state transition that updates order, inventory, quality status, and ledger movement.

## Verification

Dedicated tests cover valid and invalid orders, immutability, partial and complete receipts, excess/non-positive receipts, missing references, timestamps, and movement content. Output evals grade excess-receipt and invalid-reference clarity. The extended recording demonstrates create → receive → inventory → ledger.
