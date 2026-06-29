# ADR-0010 — Vitest as the test runner

*Status: Accepted · Date: 2026-06-29 · Source: AGENTS.md "Verify, don't assume", requirements §4, prd.md §4 metrics*

## Context
We need a test/eval runner before behavioral code lands. The repo is **native ESM**
(`"type": "module"`, `tsconfig` NodeNext + `verbatimModuleSyntax`) on **npm**, plain TS, no
framework. The behavioral rules in AGENTS.md are the test targets (totals == SUM, fact vs estimate
tagging, images-never-persisted, date back-dating) and we'll also run LLM evals. Much of this is
**mock-heavy**: the Anthropic SDK and Prisma client get mocked constantly, so ESM mocking
ergonomics dominate the choice. Test deps are **dev-only** — they never ship, so they don't count
against the 512 MB runtime cap.

## Decision
Use **Vitest**. `npm test` = `vitest run --passWithNoTests` (green until real tests land);
`npm run test:watch` = `vitest` for local dev.

Rationale: native ESM + TS via esbuild (zero loader/flag config), a Jest-compatible API
(`describe/it/expect`), and `vi.mock` that actually works under ESM — the decisive factor for
mocking Anthropic/Prisma. `--passWithNoTests` lets the pre-push and CI gates be wired now and stay
green until the first test arrives.

## Consequences
- **+** Lowest config for our ESM/TS setup; no `--experimental-vm-modules`, no ts-jest.
- **+** Clean module mocking → readable LLM/DB tests, the bulk of our suite.
- **+** Built-in coverage (v8) and watch; gate can exist before any test exists.
- **−** One more dev dependency (dev-only; irrelevant to the runtime memory cap).
- **−** Slightly smaller ecosystem than Jest, but API-compatible so knowledge transfers.

## Alternatives considered
- **Jest** — rejected. Most popular, but ESM support is still experimental: needs
  `NODE_OPTIONS=--experimental-vm-modules`, a TS transform (ts-jest/@swc/jest), and module mocking
  degrades to `jest.unstable_mockModule` + dynamic import under ESM. That mocking friction hits
  exactly our most common test shape (mocked Anthropic/Prisma) — the worst trade for this repo.
- **node:test + tsx** — rejected (for now). Most on-brand with the minimal-deps / RAM-tight ethos
  (zero test-framework deps, built into Node 20). But its module mocking (`mock.module`) is still
  experimental, risky for mock-heavy code, and the DX is thinner (no built-in watch/coverage).
  Reconsider if the dependency footprint ever becomes a real concern.
