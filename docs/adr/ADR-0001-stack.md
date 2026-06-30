# ADR-0001: Technology stack for the Plant Growth & Watering Tracker

- **Status:** Accepted
- **Date:** 2026-06-29
- **Deciders:** orchestrator + Owner (Checkpoint 1 sign-off)

## Context

The product is a deliberately SHORT, single-user web app to track succulent
(money tree) growth and watering, with a watering chart and a growth chart
(see `docs/requirements.md`). Constraints that shape the stack: persistence
that survives restarts (NFR-DATA-01, TC-03); no authentication, email, or
third-party integrations in MVP (TC-04, NFR-SEC-01); charts (TC-05); local run
only, no cloud deploy in MVP (NFR-PERF-03 / NFR-COMPAT-03 are Future); Ukrainian
UI (NFR-LOC-01). The Project Factory default stack is Next.js · Postgres+Drizzle ·
Better Auth · Resend · Vitest · Playwright · OpenSpec · Vercel.

## Decision

We will use: **Next.js (App Router, TypeScript)** for the web app · **SQLite +
Drizzle ORM** for durable local storage · **Recharts** for the charts · **Vitest**
(unit) + **Playwright** (E2E) for tests · **OpenSpec** for specs. We DROP Better
Auth and Resend (no auth/email in MVP) and DROP Postgres/Vercel (no cloud deploy
in MVP).

This swaps three pieces of the default stack; per the playbook, the swap is
recorded here and the swap drives the loop: the per-slice smoke test is a real
SQLite-DB flow; there are no auth/email checks; recordings use headless Playwright.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Next.js + **SQLite/Drizzle** (chosen) | Zero infra; file persistence survives restarts; trivial local run; Drizzle keeps a migration/smoke story identical to the default | Not serverless-deploy-friendly as-is (fine — deploy is Future) |
| Next.js + Postgres/Drizzle (PF default) | Cloud-deploy ready; matches default loop exactly | Requires a running Postgres for every local run/CI — overkill for a single-user "коротку" app |
| No framework / plain Vite SPA + IndexedDB | Smallest footprint | Loses SSR/server-action conventions in `AGENTS.md`; IndexedDB persistence is browser-bound, weaker durability story; diverges from the loop's defaults |

## Consequences

- **Easier:** local setup is a single `npm run dev`; no DB server; migrations and
  the per-slice smoke flow run against a file-based SQLite DB.
- **Accepted / harder:** cloud deployment is deferred — when it becomes MVP+1, a
  follow-up ADR swaps SQLite→Postgres (Drizzle keeps the schema portable).
- **Follow-ups:** wire `db:generate`/`db:migrate`/`db:seed` scripts against
  Drizzle+SQLite; charts go through `Recharts`; UI copy is authored in Ukrainian
  while code/specs stay English.
