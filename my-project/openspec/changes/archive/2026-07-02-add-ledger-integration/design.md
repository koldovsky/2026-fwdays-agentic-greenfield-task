# Design

`movementLedger` creates a detached newest-first projection with resolved item names, localized type labels, and actor names. The page renders only this read model and exposes no mutation control. Repository integration remains isolated behind `lib/repository.ts`.

## Verification

Ledger tests prove ordering, resolution, and detached immutability. The extended browser recording shows the newest +24 receipt movement. Repository integration tests provide cross-file evidence for the underlying transaction boundary.
