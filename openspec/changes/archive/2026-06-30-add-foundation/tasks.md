## 1. Monorepo & workspaces

- [x] 1.1 Configure npm-workspaces root (`apps/*`, `packages/*`) with a single root install
- [x] 1.2 Enforce package boundaries (shared framework-free; Prisma only in api; mobile consumes REST + shared types)
- [x] 1.3 Verify a clean `npm install` from the root hoists all deps with no per-package install

## 2. Shared contracts package (`@honeydo/shared`)

- [x] 2.1 Create `@honeydo/shared` with API type contracts (`contracts.ts`, incl. `HealthStatus`)
- [x] 2.2 Add pure duration logic with co-located Jest unit tests (TC-PURE-01, TC-TEST-01)
- [x] 2.3 Configure CommonJS build to `dist/` consumed by the apps
- [x] 2.4 Confirm `npm run build -w @honeydo/shared` runs before app builds in the root build script
- [x] 2.5 Confirm pure modules are 100% unit-tested (coverage check)

## 3. API + database (`@honeydo/api`)

- [x] 3.1 Scaffold NestJS 11 app with global `PrismaModule`/`PrismaService` and `ConfigModule`
- [x] 3.2 Add Prisma (pinned 6.19.3) + first migration; `GET /health` returns shared `HealthStatus`
- [x] 3.3 Add `docker-compose.yml` (Postgres 16, host port 5434) + `db:up`/`db:down`/`db:reset` scripts
- [x] 3.4 Add class-validator global validation pipe and document the DTO validation pattern (TC-STACK-02)
- [x] 3.5 Verify boot-against-Postgres + health end-to-end on a clean checkout _(verified 2026-06-30: `db:up` → `migrate` → `api` boots on :3333, `GET /health` returns ok)_

## 4. Mobile app + design tokens (`@honeydo/mobile`)

- [x] 4.1 Scaffold Expo SDK 57 + TS app with monorepo `metro.config.js`
- [x] 4.2 Add typed design-token theme (`src/theme/`) with `useTheme()`, Dark default, no raw hex (FR-THEME-03)
- [x] 4.3 Add a lint guard against raw hex literals in `apps/mobile` screens/components
- [x] 4.4 Document the Expo Dev Client + prebuild path for Phase 6 native extensions (TC-STACK-01)
- [x] 4.5 Produce and verify a Dev Client prebuild configuration capable of hosting native extensions _(config: `expo-dev-client` dep + `prebuild` script + bundle ids; verified version compat + `expo config`. Full native prebuild runs in Phase 6 with the toolchain.)_

## 5. Developer-experience quality gate (NFR-DX-01)

- [x] 5.1 Add a composed backend gate script: `lint && typecheck && test && build`
- [x] 5.2 Ensure TypeScript strict mode is enabled across `shared` and `api`
- [x] 5.3 Verify the gate runs green in under 60 s on a clean checkout (measure and record) _(clean-checkout `npm run gate`: green in ~21 s)_

## 6. Finalize

- [x] 6.1 `openspec validate add-foundation --strict`
- [x] 6.2 Update `docs/current-state.md` with the foundation capability status
- [x] 6.3 `openspec archive add-foundation` to promote the delta into `openspec/specs/foundation/`
