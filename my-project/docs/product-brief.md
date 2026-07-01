# Product Brief — Corporate Procurement and Manufacturing Inventory System

## Product intent

Small and medium manufacturers often coordinate purchasing, warehouse intake, and production through disconnected spreadsheets. That creates stale stock balances, weak auditability, avoidable stockouts, and excess working capital tied up in inventory. This product is a single-server web prototype that connects those workflows through a transactional inventory ledger.

## Users

- **Administrator:** manages suppliers, inventory master data, users, thresholds, and all operational workflows.
- **Staff operator:** creates procurement requests and orders, receives goods, executes production runs, and reads the stock ledger without changing protected master data.

## Core workflows

1. A user signs in and sees inventory valuation, pending-order value, and reorder warnings.
2. Procurement creates and progresses a supplier order, then records partial or complete receipt.
3. Receipt places material into quality inspection, increments stock, and appends an auditable movement.
4. Manufacturing selects a finished good and output quantity, previews BOM needs, validates usable stock, and atomically converts raw materials into finished goods.
5. Users inspect the immutable movement history; administrators maintain supplier and item master data.

## MVP boundary

The MVP is a locally runnable Next.js App Router application backed by seven JSON files through a unified repository interface. It includes seeded demo data, server-side authentication, Admin/Staff authorization, procurement and receiving, manufacturing execution, inventory analytics, and an audit ledger. It is explicitly a single-process prototype rather than a horizontally scalable production deployment.

Advanced financial reconciliation, invoice tolerance automation, EOQ demand modeling, external supplier transmission, and migration to PostgreSQL remain future work.

## Success indicators

- A new evaluator can run the app locally and sign in with `test` / `test`.
- Every successful stock mutation creates a consistent movement record.
- Invalid or unauthorized operations return a clear inline error and leave all files unchanged.
- Dashboard totals and reorder warnings reflect the current persisted data.

