## Context

Honeydo is a warm, honey-themed iOS personal time tracker built as an npm-workspaces
monorepo. The foundation is largely scaffolded already (see `docs/current-state.md`):
the monorepo root, `@honeydo/shared` (contracts + tested pure duration logic),
`@honeydo/api` (NestJS 11 + Prisma 6.19.3, global `PrismaModule`/`PrismaService`,
`GET /health`), local Postgres 16 via `docker-compose.yml` (host port 5434, first
migration applied), and `@honeydo/mobile` (Expo SDK 57 + TS, monorepo Metro config,
typed design-token theme). This change formalizes that scaffold as the `foundation`
OpenSpec capability and closes the two known gaps: the NFR-DX-01 quality gate and the
Expo Dev Client/prebuild path.

The stack and testability constraints are fixed by `docs/requirements.md`
(TC-STACK-01/02/03, TC-PURE-01, TC-TEST-01, NFR-DX-01); this design records how the
existing structure satisfies them and how the remaining gaps are filled.

## Goals / Non-Goals

**Goals:**
- Capture the foundation as a traceable OpenSpec spec mapped to its TC/NFR IDs.
- Enforce package boundaries: `shared` framework-free, Prisma only in `api`, `mobile`
  consumes REST + shared types.
- Guarantee pure logic in `shared` is 100% unit-tested (CommonJS build before apps).
- Add a backend quality gate (`lint && typecheck && test && build` < 60 s).
- Document and verify the Expo Dev Client + prebuild path for Phase 6.

**Non-Goals:**
- No user-facing features (auth, time-entries, etc.) — those are their own capabilities.
- No resolution of the honey-vs-blackwork brand decision (tracked separately; blocks
  Phase 1 UI, not the foundation skeleton).
- No CI provider wiring beyond a runnable, time-bounded local gate script.

## Decisions

- **npm workspaces over a heavier monorepo tool (Nx/Turbo).** Lower ceremony, native
  to npm, dependencies hoist to the root. Alternative (Turborepo) adds caching we do
  not yet need; revisit if build times grow.
- **`@honeydo/shared` compiles to CommonJS in `dist/`; consumers resolve types from the
  build.** Keeps the package framework-free and consumable by both Nest (CJS) and Metro.
  Trade-off: `shared` must be built before the apps — encoded as an ordering rule.
- **Prisma pinned to 6.19.3.** Prisma 7 dropped the `url` field in `schema.prisma`;
  pinning avoids a migration of the datasource config during foundation.
- **Postgres on host port 5434 via docker-compose.** Avoids clashes with other local
  Postgres instances on 5432/5433.
- **`PrismaService` connects on boot.** The DB must be up before the API serves; boot
  fails fast otherwise, surfacing config problems early (matches NFR-OBS-01 intent).
- **Design tokens as a typed RN theme object, mirrored from the `honeydo-design` skill
  CSS.** RN has no CSS variables or `color-mix()`, so values are ported into
  `apps/mobile/src/theme/` and translucent fills are derived at runtime with `withAlpha`.
  The skill CSS remains the source of truth; the theme stays in sync by hand.
- **Quality gate as a composed npm script** (`lint && typecheck && test && build`)
  rather than a CI-only definition, so the < 60 s budget is verifiable locally on a
  clean checkout.

## Risks / Trade-offs

- **Hand-synced tokens drift from the skill CSS.** → Keep the theme object's header
  pointing at the source CSS; review token diffs when the skill changes.
- **`shared` build-before-apps ordering is easy to forget.** → Document in AGENTS.md
  (done) and have the root build script build `shared` first.
- **Dev Client/prebuild path unverified until exercised.** → Verify the prebuild
  produces a hostable Dev Client now, before Phase 6 depends on it.
- **< 60 s gate may be brittle as the codebase grows.** → Scope the gate to backend
  (`shared` + `api`) per NFR-DX-01; revisit caching if it approaches the budget.

## Migration Plan

Foundation is additive — no rollback of user data. Steps: (1) author the spec/design/
tasks, (2) add the quality-gate script and confirm it runs green under budget, (3)
verify the Dev Client/prebuild path, (4) `openspec validate add-foundation`, (5)
`openspec archive add-foundation` to promote the delta into `openspec/specs/foundation/`.

## Open Questions

- Should the quality gate run in CI now, or stay a local script until a CI provider is
  chosen? (Spec only requires it runnable + time-bounded.)
- Brand decision (honey vs blackwork) is out of scope here but blocks Phase 1 UI —
  resolve before `add-theming`.
