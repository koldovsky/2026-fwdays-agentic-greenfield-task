# MVP Capability Plan

## Delivery strategy

The build is split into six vertical slices. Every MVP FR has exactly one owning slice. A slice marked `serialize` touches shared foundations or depends on an earlier domain contract; `parallel-safe` means its implementation can proceed independently once dependencies are green.

## Dependency graph

```text
S1 foundation-auth-persistence
├── S2 dashboard-shell
└── S3 master-data
    ├── S4 procurement-receiving
    └── S5 manufacturing
        └── S6 ledger-integration
S4 procurement-receiving ──────┘
```

Critical path: **S1 → S3 → S4/S5 → S6**. The graph is acyclic.

## Slice summary

| Slice | Mode | Depends on | FR owner scope |
|---|---|---|---|
| S1 `foundation-auth-persistence` | serialize | none | FR-1–FR-7, FR-37–FR-39 |
| S2 `dashboard-shell` | parallel-safe | S1 | FR-8–FR-13 |
| S3 `master-data` | parallel-safe | S1 | FR-14–FR-17 |
| S4 `procurement-receiving` | parallel-safe | S3 | FR-18–FR-24 |
| S5 `manufacturing` | parallel-safe | S3 | FR-29–FR-34 |
| S6 `ledger-integration` | serialize | S4, S5 | FR-35–FR-36 |

## Slice definitions

### S1 — Foundation, authentication, and persistence

- **Scope:** Next.js shell, typed schemas, seeded JSON data, repository locking/atomic transactions, signed sessions, login/logout, route and role guards, shared inline error surface.
- **Definition of done:** traced unit tests prove session lifecycle, authorization, FIFO ordering, atomic rollback, and foreign-key rejection; login browser smoke passes; lint, tests, build, strict spec validation, review gate, and trajectory check pass.
- **Risks:** filesystem transaction rollback and test isolation. Mitigate with per-test temporary databases, staged validation, backups during multi-file replacement, and deterministic reset helpers.

### S2 — Dashboard and authenticated shell

- **Scope:** responsive navigation, KPI calculations, pending-order value, accessible stock-status warnings, logout affordance.
- **Definition of done:** traced calculation and rendering tests cover every threshold boundary; authenticated dashboard browser flow passes at desktop and 360px; light/dark accessibility and vision checks pass.
- **Risks:** ambiguous critical threshold and color-only communication. Use the approved boundary rules and explicit status text/icons.

### S3 — Supplier and inventory master data

- **Scope:** supplier listing/creation, inventory listing, Admin-only material status and reorder-level changes, Staff denial paths.
- **Definition of done:** traced service and UI tests cover valid/invalid inputs and role denial with unchanged files; review and battery pass.
- **Risks:** master-data mutations can invalidate references. Creation and update schemas validate all constraints; deletion is excluded from MVP.

### S4 — Procurement and receiving

- **Scope:** PO creation/listing, unique numbering, decimal totals, partial/full receipts, quality hold, stock increment, receipt movement.
- **Definition of done:** tests are observed red before implementation; traced integration tests prove partial/full/excess receipt and cross-file rollback; end-to-end order and receipt flow passes with recording evidence.
- **Risks:** duplicate PO numbers and concurrent receipts. Generate identifiers inside the write lock and re-read current remaining quantity before commit.

### S5 — Manufacturing

- **Scope:** BOM display, requirements preview, eligibility/shortage messages, atomic input/output conversion, production movements.
- **Definition of done:** traced tests cover decimal factors, invalid targets, quality-held/blocked/insufficient stock, successful conversion, rollback, and resulting movements; browser flow and visual verification pass.
- **Risks:** supplied seed BOM includes a quality-held input, so default run must fail honestly until an Admin releases it. QA records both denial and successful release/run paths.

### S6 — Ledger and cross-cutting integration

- **Scope:** newest-first immutable movement view, related names, signed quantities, actor/document context, final integration and seed reset.
- **Definition of done:** traced ledger tests cover ordering and all reason codes; no mutation endpoint exists; procurement and manufacturing movements appear end-to-end; full battery, review gate, evals, recordings, accessibility, and trajectory checks pass.
- **Risks:** unstable tests after mutating shared fixtures. E2E uses a deterministic database reset before each workflow.

## Requirement ownership proof

| Capability | Exactly owned MVP requirements |
|---|---|
| Foundation/auth/persistence | FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-37, FR-38, FR-39 |
| Dashboard/shell | FR-8, FR-9, FR-10, FR-11, FR-12, FR-13 |
| Master data | FR-14, FR-15, FR-16, FR-17 |
| Procurement/receiving | FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24 |
| Manufacturing | FR-29, FR-30, FR-31, FR-32, FR-33, FR-34 |
| Ledger integration | FR-35, FR-36 |

Future FR-25 through FR-28 and FR-40 through FR-41 are intentionally not scheduled in the MVP.

