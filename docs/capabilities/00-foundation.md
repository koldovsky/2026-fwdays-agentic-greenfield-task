# Capability: foundation

- **Order:** 00 · **Phase:** 0 · **OpenSpec change:** `add-foundation` · **Status:** in progress
- **Depends on:** — · **Blocks:** everything
- **Packages:** `packages/shared`, `apps/api`, `apps/mobile`, db (docker)

## Summary

The runnable skeleton everything else builds on: the monorepo, the shared contracts package,
the API server + database, and the design-token theme. Not a user-facing FR set — it satisfies
the stack constraints and the testability guarantees.

## Requirements (constraints)

| ID | What it requires |
|----|------------------|
| TC-STACK-01 | React Native via Expo (Dev Client + prebuild), TypeScript strict |
| TC-STACK-02 | NestJS REST API; request validation via class-validator DTOs |
| TC-STACK-03 | PostgreSQL + Prisma; migrations via Prisma Migrate |
| TC-PURE-01 | Core logic in framework-free modules (no Nest/Prisma/RN) for 100% unit-testability |
| TC-TEST-01 | Jest unit tests on pure modules; evals suite for the insight |
| NFR-DX-01 | Backend `lint && typecheck && test && build` < 60 s on a clean checkout |

## Scope

- npm-workspaces monorepo (`apps/*`, `packages/*`).
- `@honeydo/shared` — framework-free contracts + pure logic (CommonJS build).
- `@honeydo/api` — NestJS + Prisma, global `PrismaModule`/`PrismaService`, `ConfigModule`,
  `GET /health`.
- `@honeydo/mobile` — Expo SDK 57 + TS, monorepo Metro config, typed design-token theme.
- Local Postgres via `docker-compose.yml`; first migration applied.

## Status / done

Monorepo, shared, api+db (health verified end-to-end), mobile + design tokens are scaffolded.
Remaining: confirm Dev Client + prebuild path (needed by Phase 6), and the `lint`/CI gate for
NFR-DX-01.

## Non-goals

No business features here — auth and the core loop start in their own capabilities.
