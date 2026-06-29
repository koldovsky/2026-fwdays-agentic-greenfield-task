# ADR-0005 — Prisma as the ORM

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §3, §6*

## Context
The app needs typed DB access from TypeScript over a small, evolving schema (users, food_database,
food_log, body_metrics, progress_notes, reviews, notion_sync, notion_config, open_questions).
Schema changes must be version-controlled and reproducible across local and production. Connection
count is constrained (`max_connections=20`).

## Decision
Use **Prisma** as the ORM: schema-in-code (`schema.prisma`), version-controlled migrations, and a
generated type-safe client. Prisma's connection pool is sized to stay within the Postgres limit.

## Consequences
- **+** End-to-end type safety from schema to query results — fewer data-shape bugs.
- **+** Migrations are reviewable, version-controlled artifacts.
- **+** Fast schema iteration during greenfield build.
- **−** Adds a query engine to the runtime image; mitigated by the multi-stage build.
- **−** Pool sizing must respect `max_connections=20` — a real constraint to configure, not assume.

## Alternatives considered
- **Drizzle / Kysely** — viable, lighter; rejected for now: Prisma's migration tooling and DX win
  at greenfield speed. Revisit if the query-engine footprint becomes a problem.
- **Raw `pg` / SQL** — rejected: loses type safety and migration management for marginal RAM gain.
