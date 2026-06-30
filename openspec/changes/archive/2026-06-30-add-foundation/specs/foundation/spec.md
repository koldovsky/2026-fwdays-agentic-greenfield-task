## ADDED Requirements

### Requirement: Monorepo workspace structure

The project SHALL be an npm-workspaces monorepo with `apps/*` and `packages/*`
workspaces, installed once from the repo root so dependencies hoist to the root
`node_modules`. Package boundaries SHALL be enforced: `@honeydo/shared` is
framework-free, `@honeydo/api` is the only package that imports the Prisma client,
and `@honeydo/mobile` consumes the API over REST and shared contract types.

#### Scenario: Single root install hoists dependencies

- **WHEN** a developer runs `npm install` once from the repo root on a clean checkout
- **THEN** all workspace dependencies install and hoist to the root `node_modules`
- **AND** no separate install inside a package is required

#### Scenario: Shared package stays framework-free

- **WHEN** code is added to `packages/shared`
- **THEN** it MUST NOT import NestJS, Prisma, React Native, or Node built-ins
- **AND** the only Prisma client import in the repo lives in `apps/api`

### Requirement: Shared contracts package is framework-free and fully tested

The `@honeydo/shared` package SHALL contain the cross-cutting API type contracts and
pure domain logic (duration, aggregation, streak, insight-shaping), compile to
CommonJS in `dist/`, and be built before the apps that consume its types. All pure
logic in this package SHALL be 100% unit-tested (TC-PURE-01, TC-TEST-01).

#### Scenario: Pure logic is unit-tested

- **WHEN** a pure function is added or changed in `packages/shared`
- **THEN** it has accompanying Jest unit tests co-located as `*.test.ts`
- **AND** `npm run test -w @honeydo/shared` passes with the pure modules fully covered

#### Scenario: Shared builds before apps consume it

- **WHEN** `npm run build -w @honeydo/shared` is run
- **THEN** it emits CommonJS output to `dist/`
- **AND** the apps resolve `@honeydo/shared` types from that build

### Requirement: API server boots against Postgres with a health endpoint

The `@honeydo/api` NestJS service SHALL connect to PostgreSQL via Prisma on boot,
apply schema changes through Prisma Migrate, validate requests with class-validator
DTOs, and expose `GET /health` returning the shared `HealthStatus` contract
(TC-STACK-02, TC-STACK-03).

#### Scenario: Health endpoint returns the shared contract

- **WHEN** Postgres is up (`npm run db:up`), migrations are applied (`npm run migrate`),
  and the API is started (`npm run api`)
- **THEN** `GET http://localhost:3000/health` responds 200 with a body matching the
  shared `HealthStatus` type

#### Scenario: Database must be available at boot

- **WHEN** the API starts without a reachable database
- **THEN** boot fails fast with a clear error rather than serving requests in a broken state

### Requirement: Mobile app consumes a typed design-token theme

The `@honeydo/mobile` Expo (SDK 57) + TypeScript app SHALL be configured for the
monorepo (Metro watches the root and resolves hoisted deps) and SHALL render UI from
a typed design-token theme with no raw hex in screens or components. Light and Dark
SHALL be a token swap with Dark as the default (TC-STACK-01, FR-THEME-03).

#### Scenario: Screens use tokens, not raw hex

- **WHEN** a screen or component is implemented in `apps/mobile`
- **THEN** all color, spacing, radius, type, and motion values come from the typed theme
- **AND** no raw hex literals appear in screen/component code

#### Scenario: Theme swap keeps Dark default

- **WHEN** the active color scheme is toggled between light and dark
- **THEN** the UI re-resolves from the semantic token aliases without code changes
- **AND** the default scheme is dark

### Requirement: Backend developer-experience quality gate

The backend SHALL provide a quality gate that runs `lint && typecheck && test &&
build` and completes green in under 60 seconds on a clean checkout (NFR-DX-01).
TypeScript SHALL be configured in strict mode across packages.

#### Scenario: Quality gate passes under the time budget

- **WHEN** the backend quality gate is run on a clean checkout
- **THEN** lint, typecheck, test, and build all pass
- **AND** the full run completes in under 60 seconds

### Requirement: Native build path for Expo Dev Client

The mobile app SHALL support an Expo Dev Client + prebuild path so that later native
extensions (home widget, live activity) can be built outside Expo Go (TC-STACK-01,
prerequisite for Phase 6).

#### Scenario: Dev Client prebuild is documented and runnable

- **WHEN** a developer follows the documented prebuild path
- **THEN** the app produces a Dev Client build configuration capable of hosting native
  extensions
- **AND** the steps are recorded for the Phase 6 native work
