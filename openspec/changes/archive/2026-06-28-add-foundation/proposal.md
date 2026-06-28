## Why

Every later slice (directory, templates, cycles, respond, AI interview, results, report,
usage accounting) reads and writes the same Postgres data through Prisma (TC-STACK-02,
TC-STACK-04). The data model must exist once, up front, so those slices build against a
fixed schema instead of racing migrations. This is slice 0 (`foundation`) from
`docs/mvp-capability-plan.md`: it defines `prisma/schema.prisma` for all MVP entities in
the glossary and one shared Prisma client in `lib/db/`, generates the typed client, and
validates the schema — without provisioning or migrating a live database yet.

## What Changes

- Add `prisma/schema.prisma` with a `postgresql` datasource (`env("DATABASE_URL")`) and
  the Prisma JS client generator, modelling all MVP entities and their relations:
  Employee, Template, Question, Cycle, Response, Answer, Dialog, Summary, UsageRow, plus
  the enums they need (question type, cycle status, respond mode, usage purpose)
  (TC-STACK-02).
- Add one shared, framework-safe Prisma client in `lib/db/` (a single instance reused
  across hot reloads), so all DB access goes through one home — no per-call clients
  (TC-STACK-04). The client is exported with Prisma's generated types; no casts.
- Generate the Prisma client (`prisma generate`) and validate the schema
  (`prisma validate`) — both run without a database connection.
- Add `.env.example` documenting a `DATABASE_URL` placeholder (TC-DEPLOY-01).
- Add `prisma` (dev) and `@prisma/client` dependencies.

This change deliberately does **not**: run a live migration or provision a managed
Postgres (Neon/Supabase) — that is a separate step when the first slice needs persistence;
add any UI, API route, server action, or seed data; or hand-write Zod schemas for the JSON
columns (those land with the slice that first reads them).

## Capabilities

### New Capabilities
- `data-model`: the Postgres schema (via Prisma) for all MVP entities and their relations,
  plus a single shared Prisma client, generated and validated without a live database.

### Modified Capabilities
<!-- None. token-cost-calculation is unaffected; usage accounting that persists the
     cost() result is a later change that adds rows to the UsageRow table defined here. -->

## Impact

- New: `prisma/schema.prisma`, `lib/db/index.ts`, `.env.example`; `package.json` gains
  `prisma` + `@prisma/client`; generated client under `node_modules/@prisma/client`.
- No migration, no live DB, no UI/API. Consumed by every later persistence slice; the
  `UsageRow` table here is where `add-usage-accounting` will store the `cost()` result
  from the `token-cost-calculation` capability.
