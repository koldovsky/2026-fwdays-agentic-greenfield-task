# Frontend Agent Guidelines

TypeScript + Next.js static-export SPA. Managed with **yarn** — NEVER use npm, pnpm, or bun.

## Essential commands (run from `frontend/`)

- Install deps: `yarn install`
- Dev: `yarn dev`
- Build static export: `yarn build` (Next.js `output: 'export'`)
- Lint / typecheck: `yarn lint && yarn tsc --noEmit` (or the project's configured scripts)
- Pre-commit: `pre-commit install` (one-time); hooks run ruff + biome on staged files (see repo-root `.pre-commit-config.yaml`)

## Read before editing

- [Frontend conventions](CONVENTIONS.md) — yarn (NOT npm), Next 16.2.10 `output: 'export'` (no SSR/getServerSideProps/middleware/API routes), React 19.2.7, react-query 5.101.2, axios 1.18.1, Zustand 5.0.14. Hand-written `api-contract.ts` (no codegen this sprint). Three-peer chooser only gates which config panels render. **Read for any frontend code.**
- [Testing](TESTING.md) — BDD testing with Playwright, Page Object Model pattern, Gherkin feature files mapped to test steps.
- [API contract](../docs/agents/api-contract.md) — endpoints, error envelope, codes, thresholds — the frontend must round-trip the backend envelope unchanged.
- [Sprint scope](../docs/agents/sprint-scope.md) — in/out scope, filename conventions. Read before adding scope.

## Mandatory gotchas

- **Static export only** — no server components fetchers, no `getServerSideProps`, no middleware, no API routes.
- **Hand-written contract**: keep `api-contract.ts` in sync with `docs/agents/api-contract.md`; no codegen this sprint.
- **Three-peer chooser**: only gates which config (translation / voice-over / both) panels render; does not fork backend job logic.
- **Backend package manager is `uv`, not yarn** — do not mix commands across subdirs.

## Relevant skills

- [vercel-react-best-practices](../.agents/skills/vercel-react-best-practices/SKILL.md) — React/Next.js performance patterns (components, data fetching, bundle optimization).
- [e2e-testing-patterns](../.agents/skills/e2e-testing-patterns/SKILL.md) — Playwright/Cypress E2E testing standards.
- [bdd-testing](../.agents/skills/write-bdd-tests/SKILL.md) — BDD test generation (planner→writer→verifier loop).

## Test infrastructure

### Test Case IDs (Phase 02.1 retrofit)

Every Playwright `test()` block carries a stable Test Case ID
(tcid) annotation that maps to a requirement ID in
`docs/traceability/requirements-traceability.md` (D-07 + D-08 + D-09, applied
in plan 02.1-02). The matrix at
`docs/traceability/requirements-traceability.md` is the single source of
truth for "which test proves which requirement"; any new test
MUST add its tcid annotation + a row to the matrix.

- **Annotation shape** — `test.info().annotations.push({ type: 'tcid', description: '<TCID>' })` as the first line of the test body. Surfaces in the HTML report + the JSON reporter's `annotations` field. tcid-grouped runs via `npx playwright test --grep @web` work without modification.
- **Coverage** — 9 F1 `@web` tests map to EPUB-01..03; 10 F2 `@web` tests map to CONF-01/02 + XLATE-02; 1 F5 `@web @smoke` test maps to JOBS-03. The 2 F5 voiceover @skipped scenarios are preserved in the .feature file but not bound to a Playwright test (Phase 3).
- **Cross-reference** — the traceability matrix at `docs/traceability/requirements-traceability.md` lists every tcid alongside the REQ-ID it proves; the BDD scenario file:line is the canonical citation. ADR 0011 documents the recording-config corrections that landed alongside the tcid retrofit.
