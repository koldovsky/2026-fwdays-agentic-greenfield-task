# Phase 4 Verification

## Status

PHASE 4 DEPLOYMENT READINESS: PENDING HUMAN CLOUD SETUP

## Phase Objective

Prepare the repository for safe Preview and Production deployment, then verify the deployment shape, environment matrix, and offline safety checks without contacting Vercel, Upstash, or Emailnator from Codex.

## Codex-Run Readiness Pass

The offline readiness pass implemented the following:

- preserved the existing TanStack Start/Vite build path
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

The phase remains `PHASE 4 DEPLOYMENT READINESS: PENDING HUMAN CLOUD SETUP` until the human completes Vercel, Upstash, Preview, and Production checks.
## Namespace Correction

Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`. When both environments use the same Upstash database, they must not share a namespace. Changing the namespace makes existing records unreachable under the new namespace without deleting them.