# Phase 4 Verification

## Status

PHASE 4 DEPLOYMENT READINESS: PENDING HUMAN CLOUD SETUP

## Phase Objective

Prepare the repository for safe Preview and Production deployment, then verify the deployment shape, environment matrix, and offline safety checks without contacting Vercel, Upstash, or Emailnator from Codex.

## Codex-Run Readiness Pass

The offline readiness pass implemented the following:

- added the Nitro Vite integration required for Vercel-compatible TanStack Start SSR output
- kept the explicit `api/*` route surface intact
- documented the environment matrix from the actual config loaders and `.env.example`
- kept the Phase 0 probe preview-only and disabled by default
- added a bounded, opt-in smoke verifier for human Preview use
- added deterministic Phase 4 tests and offline verification scripts
- documented Preview, Production, rollback, kill-switch, rate-limit, and log-review procedures
- kept the repository free of new credentials and temporary artifacts

## Readiness Evidence

The human-facing evidence is expected to come from:

- offline deterministic tests
- local production builds
- Preview deployment checks run by a human
- Production deployment checks run by a human
- human-reviewed Vercel logs
- human-run rollback confirmation when needed

## Remaining Human Actions

- create or connect Upstash
- add Preview and Production environment variables in Vercel
- deploy Preview
- run the Preview smoke verifier
- verify the kill switch
- verify bounded rate limiting and lock contention
- deploy or promote Production
- inspect logs
- confirm rollback behavior

## Final Verdict

Phase 4 is not marked passed yet.

This document records readiness only. It will be updated after the human cloud setup and live verification steps are completed.
## Codex Offline Verification Results

Codex completed the following offline deterministic checks in the local workspace:

- `npm run lint` passed with the same six pre-existing React Fast Refresh warnings and no errors
- `npm run typecheck` passed
- `npm run test:phase0` passed
- `npm run test:phase1` passed
- `npm run test:phase2` passed
- `npm run test:phase3` passed
- `npm run test:phase4` passed
- `npm run test:deterministic` passed

The local `npm run build` and `npm run verify:phase4` commands failed in this Windows-managed sandbox because Vite could not load the native `@tailwindcss/oxide-win32-x64-msvc` binding and hit `spawn EPERM` while resolving dependencies. That limitation was recorded separately and not treated as a product defect.

A human then ran the complete local verification in normal PowerShell and `npm run verify:phase4` passed in full. The human local wrapper verified lint with 0 errors and 6 pre-existing warnings, typecheck, all 107 deterministic tests, Phase 0-4 suites including Phase 4 at 13/13, the Vite client build, the Vite SSR build, the Nitro build, and the final Phase 4 artifact plus sensitive-boundary verification. The final local footprint is 4 explicit API functions plus 1 Nitro SSR function, and the preview-only Phase 0 probe remains excluded from the deployed count.

The phase remains `PHASE 4 DEPLOYMENT READINESS: PENDING HUMAN CLOUD SETUP` until the human completes Vercel Preview, live Preview checks, and later Production checks.

## Deployment Correction

The first live deployment was accidentally classified as Production, returned `404: NOT_FOUND` at the root, and the health-only smoke response exceeded 65,536 bytes. No inbox was generated and no live Emailnator request occurred. That live evidence disproved the earlier no-Nitro assumption, so the repository now includes the Nitro Vite integration that produces the deployable SSR output. The `/api/health` entrypoint was remediated into a standalone Web Handler, and the preview-only probe is excluded from the deployed count. The deployed Vercel footprint is 4 explicit API functions plus 1 SSR entry, while the preview-only probe remains in source for Phase 0 evidence.

The first post-build offline verifier run exposed a stale pre-Nitro client-output path; the verifier was corrected to inspect `.output/public` as the Nitro client/public root while keeping `.output/server/index.mjs` and `.output/nitro.json` as separate server-output assertions. The standalone `/api/health` Web Handler also passed offline verification after the boundary remediation.
## Namespace Correction

Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`. When both environments use the same Upstash database, they must not share a namespace. Changing the namespace makes existing records unreachable under the new namespace without deleting them.
