# Phase 4 Verification

## Status

PHASE 4 DEPLOYMENT READINESS: PENDING HUMAN CLOUD SETUP

## Phase Objective

Prepare the repository for safe Preview and Production deployment, then verify the deployment shape, environment matrix, and offline safety checks without contacting Vercel, Upstash, or Emailnator from Codex.

## Codex-Run Readiness Pass

The offline readiness pass implemented the following:

- added the Nitro Vite integration required for Vercel-compatible TanStack Start SSR output
- kept the Nitro-owned `routes/api/*` public API surface intact
- documented the environment matrix from the actual config loaders and `.env.example`
- kept the Phase 0 probe server-only, disabled by default, and blocked in Production
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

A human then ran the complete local verification in normal PowerShell and `npm run verify:phase4` passed in full. The human local wrapper verified lint with 0 errors and 6 pre-existing warnings, typecheck, all 108 deterministic tests, Phase 0-4 suites including Phase 4 at 14/14, the Vite client build, the Vite SSR build, the Nitro build, and the final Phase 4 artifact plus sensitive-boundary verification. The final local footprint is a Nitro server runtime owning the SSR route and the four public API routes under `routes/api/*`, and the preview-only Phase 0 probe remains server-only and excluded from the deployed count. The exact deployed Vercel function count remains provisional until human Preview verification.

The final bounded local Nitro runtime smoke against the freshly generated output passed as well: `GET /api/health` returned 200 JSON with `no-store`, `HEAD /api/health` returned 200 with zero body bytes, `POST /api/inboxes` with the provider disabled returned the documented `503 PROVIDER_UNAVAILABLE` JSON response without a capability or inbox address, `GET /` returned 200 HTML, and the dynamic message-reference route stayed owned by the API runtime instead of falling through to application HTML. No unresolved external `.ts` runtime import, standalone Vercel API entry, or public Phase 0 probe route remained in the fresh output. No inbox was generated, no Emailnator request was made, no direct Upstash request was made, and the local Nitro process plus temporary process environment were cleaned up.

The environment-template correction also held in the final offline pass: `.env.example` is UTF-8 without BOM, begins with `EMAILNATOR_PROBE_ENABLED`, uses `email-shadow-panel-local` for the generic local namespace, and still documents `email-shadow-panel-preview` and `email-shadow-panel-production` separately for Preview and Production. The Phase 0 diagnostic values remain local-only and must not be configured in Vercel.

A subsequent clean verification run exposed that the deterministic Phase 4 tests still depended on stale build output. This was a verification sequencing defect, so the verifier was split into build-independent offline readiness checks and separate post-build Nitro artifact assertions. No Nitro route or application behavior changed, and a fresh human local `npm run verify:phase4` remains required before live verification.

The phase remains `PHASE 4 DEPLOYMENT READINESS: PENDING HUMAN CLOUD SETUP` until the human completes Vercel Preview, live Preview checks, and later Production checks. Live Preview provider-disabled verification, provider-enabled smoke, and Production configuration and verification all remain pending.

## Deployment Correction

The first live deployment was accidentally classified as Production, returned `404: NOT_FOUND` at the root, and the health-only smoke response exceeded 65,536 bytes. No inbox was generated and no live Emailnator request occurred. That live evidence disproved the earlier no-Nitro assumption; the first consolidation had placed the public API adapters in TanStack route-tree files under `src/routes/api/*`, so the repository now uses the Nitro filesystem `routes/api/*` tree that the Vercel preset recognizes for the deployed SSR output and public API routes. The legacy root API entries were retired, the probe implementation remains server-only in `server/providers/emailnator/probe.server.ts`, and the deployed Vercel footprint remains provisional until a human Preview deployment confirms it.

The first post-build offline verifier run exposed a stale pre-Nitro client-output path; the verifier was corrected to inspect `.output/public` as the Nitro client/public root while keeping `.output/server/index.mjs` and `.output/nitro.json` as separate server-output assertions. The Nitro health route also passed offline verification after the boundary remediation. The supported Phase 0 probe workflow is the local CLI `npm run probe:emailnator`; no public HTTP probe route is deployed.

## Namespace Correction

Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`. When both environments use the same Upstash database, they must not share a namespace. Changing the namespace makes existing records unreachable under the new namespace without deleting them. The generic local `.env.example` uses `email-shadow-panel-local` for local development.
