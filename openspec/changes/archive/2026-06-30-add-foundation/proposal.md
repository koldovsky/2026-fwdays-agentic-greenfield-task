## Why

Every other capability (auth → core loop → iOS surfaces) depends on a runnable
skeleton: the monorepo, the framework-free contracts package, the NestJS API + Postgres,
and the typed design-token theme. Most of this is already scaffolded but was never
captured as an OpenSpec capability, so the stack constraints (TC-STACK-01/02/03,
TC-PURE-01, TC-TEST-01, NFR-DX-01) have no traceable spec and the remaining gaps
(Expo Dev Client/prebuild path, the `lint`/CI quality gate) are untracked.

## What Changes

- Establish `foundation` as the first OpenSpec capability spec, codifying the stack
  and testability constraints the whole product builds on.
- Document the npm-workspaces monorepo layout and package boundaries
  (`@honeydo/shared` framework-free, `@honeydo/api` owns Prisma, `@honeydo/mobile`
  consumes REST + shared types) as enforceable requirements.
- Require the shared contracts package to be framework-free and 100% unit-tested
  (TC-PURE-01, TC-TEST-01).
- Require the API to boot against Postgres and expose `GET /health` returning the
  shared `HealthStatus` contract (TC-STACK-02/03).
- Require the mobile app to consume a typed design-token theme (no raw hex) with a
  Light/Dark token swap, Dark default (TC-STACK-01, ties to FR-THEME-03).
- Add a backend quality gate: `lint && typecheck && test && build` runs green in
  under 60 s on a clean checkout (NFR-DX-01) — closes a known gap.
- Confirm and document the Expo Dev Client + prebuild path needed before Phase 6
  native extensions (TC-STACK-01) — closes a known gap.

## Capabilities

### New Capabilities
- `foundation`: The runnable monorepo skeleton, shared contracts package, API +
  database, design-token theme, and the developer-experience quality gate that the
  rest of the product depends on. Infra/constraint capability, not a user-facing FR set.

### Modified Capabilities
<!-- None — foundation is the first spec; no existing capability requirements change. -->

## Impact

- **Packages:** `packages/shared`, `apps/api`, `apps/mobile`, plus the docker Postgres.
- **Requirements:** TC-STACK-01/02/03, TC-PURE-01, TC-TEST-01, NFR-DX-01.
- **Code:** Mostly already scaffolded (monorepo, shared, api+db, mobile + tokens — see
  `docs/current-state.md`). Net-new work is the CI/lint gate and verifying the Dev
  Client/prebuild path; the rest is formalizing existing structure into a spec.
- **Dependencies:** npm workspaces, NestJS 11, Prisma 6.19.3, Postgres 16 (docker,
  host port 5434), Expo SDK 57, TypeScript ~6.0 strict, Jest.
- **Blocks:** everything downstream — `auth` and all later capabilities depend on this.
