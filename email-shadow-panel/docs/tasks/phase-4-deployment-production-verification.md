# Phase 4 - Deployment Readiness and Production Verification

## Status

PHASE 4 DEPLOYMENT READINESS: PENDING HUMAN CLOUD SETUP

## Objective

Prepare Email Shadow Panel for safe Vercel Preview and Production deployment without deploying, without creating cloud resources, and without exposing secrets in the repository or in Codex.

## Context Used

- `../AGENTS.md`
- `AGENTS.md`
- `docs/specs/001-mvp-specification.md`
- `docs/specs/002-architecture.md`
- `docs/adr/001-vercel-http-adapter.md`
- `docs/adr/002-anonymous-session-persistence.md`
- `docs/adr/003-public-api-abuse-controls.md`
- `docs/verification/phase-0.md`
- `docs/verification/phase-1.md`
- `docs/verification/phase-2.md`
- `docs/verification/phase-3.md`
- `docs/agentic-process.md`
- `.env.example`
- `package.json`
- `vite.config.ts`
- `routes/api/*`
- `server/api/*`
- `server/session/*`
- `scripts/*`
- `tests/phase0/*`
- `tests/phase1/*`
- `tests/phase2/*`
- `tests/phase3/*`

## In Scope

- verify the TanStack Start, Vite, and Nitro deployment shape for Vercel Hobby
- keep the app rooted at `email-shadow-panel`
- preserve the public API behavior under `routes/api/*` and the TanStack Start SSR entry
- document the environment matrix from the actual config loaders and `.env.example`
- preserve a safe, preview-only Phase 0 probe disposition
- add bounded smoke-verification tooling for Preview
- add deterministic Phase 4 tests and offline verification scripts
- document Preview, Production, rollback, kill-switch, rate-limit, and log-review procedures
- preserve Phase 0-3 evidence and regressions

## Explicit Non-Goals

- no live Vercel login or deployment from Codex
- no Upstash provisioning from Codex
- no Emailnator live traffic from Codex
- no real credentials in repository files
- no `vercel.json` unless the code itself requires it later
- no UI redesign unless a deployment defect requires a minimal fix
- no checker artifact
- no commit or push

## Implementation Notes

- The repository now builds as a TanStack Start app with Vite plus Nitro for Vercel-compatible SSR output, a separate `src/server.ts` SSR entry, Nitro-owned public API routes under `routes/api/*` (Nitro filesystem routes rather than TanStack route-tree files), and a server-only Phase 0 probe implementation that remains out of the deployed route inventory.
- The deployed footprint is now Nitro-owned and provisional until human Preview verification confirms the exact Vercel function count. Do not rely on the retired root `/api` function footprint.
- The `/api/health` route is served by the Nitro route layer and returns no-store JSON without importing composition-root, provider, Redis, or environment configuration modules.
- The Phase 0 probe remains preview-only, disabled by default, and blocked in Production.
- The health route stays minimal and no-store.
- The smoke verifier is opt-in only and never part of `npm test` or deterministic verification.
- Preview and Production secrets must be entered directly into Vercel's UI, never into Codex, docs, or Git.
- Human local verification passed in normal PowerShell with the full wrapper, including all 108 deterministic tests, the client build, SSR build, Nitro build, and the final Phase 4 artifact verifier.

The final bounded local Nitro runtime smoke against the fresh generated output also passed: `GET /api/health`, `HEAD /api/health`, `POST /api/inboxes` with the provider disabled, `GET /`, and the dynamic message-reference route all behaved as expected without unresolved external `.ts` imports, standalone Vercel API entries, or a public Phase 0 probe route. No inbox was generated, no Emailnator request was made, no direct Upstash request was made, and the local Nitro process plus temporary process environment were cleaned up.

The final environment-template check also passed: `.env.example` is UTF-8 without BOM, begins with `EMAILNATOR_PROBE_ENABLED`, uses `email-shadow-panel-local` for the generic local namespace, and keeps the Preview and Production namespaces distinct.

## Testing Strategy

- `npm run test:phase0`
- `npm run test:phase1`
- `npm run test:phase2`
- `npm run test:phase3`
- `npm run test:phase4`
- `npm run verify:phase4`
- `npm run build`
- human local `npm run verify:phase4` pass in normal PowerShell
- `npm run test:phase4` and `npm run test:deterministic` are build-independent offline checks and must succeed without `.output`
- `npm run build` followed by the direct `scripts/verify-phase4.ts` verifier performs the post-build Nitro artifact assertions

## Deferred To Human

- create or connect one Upstash Redis database
- import the GitHub repository into Vercel
- set the Vercel project Root Directory to `email-shadow-panel`
- enter Preview and Production environment variables separately
- deploy Preview
- run the Preview smoke checklist
- perform the kill-switch verification
- perform the bounded rate-limit and lock checks
- deploy or promote Production
- verify logs
- confirm rollback behavior

## Phase 4 Readiness Exit Criteria

This readiness pass is complete when the repository has:

- a verified Vercel-compatible build configuration
- a complete environment matrix
- safe preview-only probe guardrails
- bounded smoke tooling
- Preview and rollback runbooks
- deterministic Phase 4 tests
- offline verification scripts
- no sensitive artifacts in the worktree

The human cloud setup remains pending.

## Codex Offline Verification

The maker pass completed these offline checks successfully:

- `npm run lint`
- `npm run typecheck`
- `npm run test:phase0`
- `npm run test:phase1`
- `npm run test:phase2`
- `npm run test:phase3`
- `npm run test:phase4`
- `npm run test:deterministic`

The local `npm run build` and `npm run verify:phase4` commands still hit the managed Windows `@tailwindcss/oxide` / Vite `spawn EPERM` limitation in this environment. No Vercel, Upstash, or Emailnator request was made.
