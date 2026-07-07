# Agentic Process Record

## Project Context

Email Shadow Panel is the course project for Agentic Engineering: Greenfield. The repository must show context engineering, specifications before implementation, verification loops, maker or checker separation, and honest evidence.

## Human Decisions Made Before Implementation

The human selected:

- Email Shadow Panel.
- The existing frontend baseline.
- An anonymous no-account product.
- Vercel Hobby.
- Direct HTTP feasibility investigation.
- No production Playwright.
- Upstash only after feasibility.
- Usage-conscious phased execution.
- The Phase 0 amendment set recorded on 2026-07-05.

## Agent Responsibilities

Codex is expected to inspect repositories, implement approved phase specifications, add tests, run deterministic verification, and summarize real outcomes and risks.

## Human Responsibilities

The human approves architecture, performs live provider checkpoints, evaluates product UX, reviews findings, records the demo video, and submits the PR.

## Context-Engineering Approach

Stable context belongs in `AGENTS.md` files. Dynamic phase-specific context belongs in `docs/tasks/`. Completed factual results belong in `docs/verification/` and this process record.

## Maker/Checker Strategy

- Maker: Codex implementation in the local workspace.
- Independent checker: a separate review session after implementation.
- Deterministic tests: run before claiming readiness for human verification.
- CodeRabbit: final broad PR checker after changes are pushed in a later step.
- Human: approval and live-verification gates.

Phase 1 explicitly did not create a separate checker artifact because the user requested a maker-only consolidated pass for this phase. Independent review remains deferred to a later human or checker step.

## Tooling

Selected tools for Phases 0 and 1:

- Codex in the local workspace.
- Git.
- npm scripts from the existing project.
- Native Node.js runtime pinned to major 22 for this phase.
- Vercel Preview in a later deployment phase.
- CodeRabbit PR review in a later step.

## Phase Log

### Phase 0 - Emailnator HTTP feasibility

- Status: passed for local feasibility, GO for Phase 1.
- Maker: Codex.
- Final local architecture result: direct HTTP Emailnator adapter is viable for the MVP; production Playwright is not required.
- Accepted production path: Gmail-style generation with `dotGmail` by default and bounded `googleMail` fallback.
- Rejected production path for the MVP: custom-domain generation.
- Deferred gate: Vercel Preview compatibility is deferred to Phase 4.

### Phase 0 - Deterministic verification summary

- Codex-run deterministic checks passed for typecheck, Phase 0 tests, capsule restoration, and lint with the same 6 pre-existing frontend warnings.
- `npm run verify:phase0` in the managed Codex environment again stopped only at the known Vite or Tailwind `spawn EPERM` native-module build limitation after lint, typecheck, and tests had already passed.
- Human-run deterministic verification in normal local PowerShell completed with `npm run verify:phase0: PASS`.
- The managed-environment build issue was classified as environmental rather than an implementation defect.

### Phase 0 - Checker and remediation history

- An independent checker previously found the local detail-content exposure issue.
- The maker remediated that issue.
- The independent recheck approved the remediation.
- Later live tests surfaced three focused defects:
  - custom-domain delivery incompatibility;
  - missing safe local index selection for detail;
  - narrow opaque-ID compatibility during live list persistence.
- The maker corrected each focused defect.
- Deterministic regression coverage was added for each correction.
- No further dedicated checker was used after the final focused corrections because CodeRabbit will serve as the final broad PR checker.

### Phase 0 - Final human live verification closure

- Actor for live verification: human.
- Environment: normal local PowerShell.
- Maker: Codex.
- Gmail-style generation passed.
- External inbound delivery passed.
- Cross-process capsule restoration passed.
- Indexed message listing passed.
- Detail retrieval through the selected numeric index passed.
- Detail output remained restricted to structural evidence only.
- No sensitive content was printed.
- No CAPTCHA, provider challenge, or rate limit was encountered.
- Capsule cleanup passed.
- Repository safety check passed.
- Final live flow passed.

### Phase 0 - Closure outcome

- Final Phase 0 local feasibility gate: GO FOR PHASE 1.
- Direct HTTP Emailnator integration is accepted for local feasibility.
- Production Playwright is not required for the MVP.
- Vercel Preview verification is deferred to Phase 4.
- No automatic commit or push was performed in this closure step.

### Phase 1 - Production provider and anonymous session core

- Status: implemented and locally verified for deterministic review.
- Actor: maker Codex.
- Context and specification files used:
  - `../AGENTS.md`
  - `AGENTS.md`
  - `docs/specs/001-mvp-specification.md`
  - `docs/specs/002-architecture.md`
  - `docs/adr/001-vercel-http-adapter.md`
  - `docs/verification/phase-0.md`
  - `docs/agentic-process.md`
  - `.env.example`
  - `package.json`
  - `server/providers/emailnator/*`
  - `scripts/*`
  - `tests/phase0/*`
- Principal implementation decisions:
  - namespace split corrected so Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`; the two environments must not share a namespace when they point at the same Upstash database.
  - introduced a formal `InboxProvider` contract and a production Emailnator provider wrapper around the proven Phase 0 transport;
  - kept provider cookies, XSRF handling, and opaque provider message IDs provider-specific and server-only;
  - introduced a server-only anonymous session model with capability-token hashes, HMAC visitor hashes, encrypted internal session state, optimistic-concurrency versioning, and TTL-based expiration;
  - stored application message-reference mappings only inside encrypted state and bounded them deterministically;
  - implemented deterministic in-memory persistence and an Upstash Redis repository with a Lua compare-and-set update that preserves remaining TTL.
- Deterministic checks run by Codex:
  - `npm run typecheck`: PASS
  - `npm run lint`: PASS with the same 6 pre-existing frontend warnings
  - `npm run test:phase0`: PASS
  - `npm run test:phase1`: PASS
  - `npm run test:deterministic`: PASS
  - `npm run build`: FAIL in the managed environment because the known Vite or Tailwind `spawn EPERM` and Tailwind native-module issue recurred
- Environment-specific failures separated from implementation defects:
  - the managed-environment build failure was recorded as environmental because lint, typecheck, Phase 0 tests, and Phase 1 tests passed before build execution;
  - no live Upstash, live Emailnator, or Vercel action was attempted in this phase.
- Documentation changes:
  - added `docs/tasks/phase-1-production-provider-session-core.md`
  - added `docs/verification/phase-1.md`
  - added `docs/adr/002-anonymous-session-persistence.md`
  - updated `docs/specs/002-architecture.md`
  - updated this process record
- Network and infrastructure boundary:
  - no real Emailnator requests were made by Codex for Phase 1;
  - no real Upstash connection was made;
  - no Vercel deployment was performed.
- Commit behavior:
  - no automatic commit or push was performed.

### Phase 1 - Final documentation closure

- Maker: Codex.
- Human actor: final local verification and diff review.
- One consolidated implementation pass was used.
- Deterministic verification passed.
- The managed Codex build limitation was separated from implementation defects.
- The same build passed in the human local environment through `npm run verify:phase1`.
- No separate Phase 1 checker was used.
- CodeRabbit remains the final broad PR checker.
- No auto-commit occurred.

### Phase 2 - Public API and abuse protection

- Status: implemented and locally verified for deterministic review.
- Actor: maker Codex.
- Context and specification files used:
  - `../AGENTS.md`
  - `AGENTS.md`
  - `docs/specs/001-mvp-specification.md`
  - `docs/specs/002-architecture.md`
  - `docs/adr/001-vercel-http-adapter.md`
  - `docs/adr/002-anonymous-session-persistence.md`
  - `docs/tasks/phase-1-production-provider-session-core.md`
  - `docs/verification/phase-1.md`
  - `docs/agentic-process.md`
  - `.env.example`
  - `package.json`
  - `api/*`
  - `server/providers/*`
  - `server/session/*`
  - `tests/phase0/*`
  - `tests/phase1/*`
- Principal implementation decisions:
  - namespace split corrected so Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`; the two environments must not share a namespace when they point at the same Upstash database.
  - added a public transport layer under `server/api/` with stable public success and error contracts;
  - accepted bearer capabilities only through `Authorization: Bearer` and rejected malformed, duplicated, query-string, and oversized variants;
  - implemented a server-generated anonymous visitor cookie with rotation for malformed values and immediate keyed visitor hashing;
  - extracted the client IP from the trusted forwarded boundary and hashed it immediately with domain separation;
  - introduced deterministic fixed-window rate limiters, repository-backed active-slot reservations, and per-capability operation locks;
  - threaded abort signals through the session service and provider boundary so timeouts cancel provider work and avoid late state writes;
  - added a provider kill switch, stable error mapping, and minimal redacted diagnostics;
  - kept the frontend unmodified and unconnected to the new API in this phase.
- Deterministic checks run by Codex:
  - `npm run lint`: PASS with the same 6 pre-existing frontend warnings
  - `npm run typecheck`: PASS
  - `npm run test:phase0`: PASS
  - `npm run test:phase1`: PASS
  - `npm run test:phase2`: PASS
  - `node --experimental-transform-types ./scripts/verify-phase2.ts`: PASS
  - `npm run verify:phase2`: FAIL only at `npm run build` in the managed environment after lint, typecheck, Phase 0 tests, Phase 1 tests, and Phase 2 tests had already passed
  - `npm run build`: FAIL in the managed environment with the known Vite or Tailwind native-module and `spawn EPERM` issue
- Environment-specific failures separated from implementation defects:
  - the managed-environment build failure was recorded separately because all deterministic lint, typecheck, Phase 0, Phase 1, and Phase 2 checks passed before build execution stopped;
  - no live Upstash, live Emailnator-through-service, or Vercel action was attempted in this phase.
- Documentation changes:
  - added `docs/tasks/phase-2-public-api-abuse-protection.md`
  - added `docs/verification/phase-2.md`
  - added `docs/adr/003-public-api-abuse-controls.md`
  - updated `docs/specs/002-architecture.md`
  - updated `.env.example`
  - updated `package.json`
  - updated this process record
- Network and infrastructure boundary:
  - no real Emailnator requests were made by Codex for Phase 2;
  - no real Upstash connection was made;
  - no Vercel deployment was performed.
- Checker behavior:
  - no separate checker artifact was created because the user explicitly requested a maker-only consolidated pass for this phase;
  - CodeRabbit remains the final broad PR checker after a later push.
- Commit behavior:
  - no automatic commit or push was performed.

### Phase 2 - Final documentation closure

- Maker: Codex.
- Human actor: final local verification and diff review.
- One consolidated implementation pass was used.
- All deterministic tests and builds passed locally.
- The earlier managed-environment build limitation was separated from implementation defects.
- No separate Phase 2 checker was used.
- CodeRabbit remains the final broad PR checker.
- No auto-commit occurred.

### Phase 3 - Frontend integration

- Status: implemented and locally verified for deterministic review with a managed-environment build limitation recorded separately.
- Actor: maker Codex.
- Context and specification files used:
  - `../AGENTS.md`
  - `AGENTS.md`
  - `docs/specs/001-mvp-specification.md`
  - `docs/specs/002-architecture.md`
  - `docs/adr/001-vercel-http-adapter.md`
  - `docs/adr/002-anonymous-session-persistence.md`
  - `docs/adr/003-public-api-abuse-controls.md`
  - `docs/tasks/phase-2-public-api-abuse-protection.md`
  - `docs/verification/phase-2.md`
  - `docs/agentic-process.md`
  - `package.json`
  - current `src/`, `api/`, `server/`, and existing test files
- Principal implementation decisions:
  - namespace split corrected so Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`; the two environments must not share a namespace when they point at the same Upstash database.
  - replaced the mock production inbox flow with one typed same-origin browser API client over the Phase 2 public routes;
  - introduced a versioned bounded browser-local recent-inbox repository that stores only capability tokens, safe inbox metadata, and selected-inbox identity;
  - introduced a focused inbox controller to own startup restoration, selected-inbox switching, cancellable list and detail loading, polling timers, overlap prevention, and local-storage synchronization;
  - kept hostile message rendering text-only and inert by consuming the provider-neutral detail contract rather than rendering raw HTML;
  - expanded OTP detection into a deterministic local-only heuristic with bounded numeric and constrained alphanumeric support;
  - removed the obsolete mock frontend provider path from production usage and deleted the dead mock service modules.
- Deterministic checks run by Codex:
  - `npm run lint`: PASS with the same 6 pre-existing frontend Fast Refresh warnings and 0 errors
  - `npm run typecheck`: PASS
  - `npm run test:phase0`: PASS
  - `npm run test:phase1`: PASS
  - `npm run test:phase2`: PASS
  - `npm run test:phase3`: PASS
  - `npm run test:deterministic`: PASS
  - `node --experimental-transform-types ./scripts/verify-phase3.ts`: PASS
  - `npm run build`: FAIL in the managed environment because the known Vite or Tailwind Windows native-module and `spawn EPERM` issue recurred
  - `npm run verify:phase3`: FAIL only at the same managed-environment build step after lint, typecheck, and all deterministic tests had already passed
  - `git diff --check`: PASS
- Environment-specific failures separated from implementation defects:
  - the managed-environment build failure was recorded separately because lint, typecheck, and all deterministic Phase 0-3 tests passed before build execution stopped;
  - no live Emailnator, Upstash, or Vercel operation was attempted in this phase.
- Documentation changes:
  - added `docs/tasks/phase-3-frontend-integration.md`
  - added `docs/verification/phase-3.md`
  - added `scripts/verify-phase3.ts`
  - updated `docs/specs/002-architecture.md`
  - updated `docs/agentic-process.md`
  - updated `package.json`
- Network and infrastructure boundary:
  - no real Emailnator requests were made by Codex for Phase 3;
  - no real Upstash connection was made;
  - no Vercel deployment was performed.
- Checker behavior:
  - no separate Phase 3 checker artifact was created because the user explicitly requested a maker-only consolidated pass for this phase;
  - CodeRabbit remains the final broad PR checker after a later push.
- Cleanup behavior:
  - the ignored `.local/phase0` verification state created by Phase 0 regression checks was confirmed ignored through `git check-ignore -v` and then removed;
  - no secret or sensitive artifact remained after cleanup.
- Commit behavior:
  - no automatic commit or push was performed.

### Phase 3 - Final documentation closure

- Maker: Codex.
- Human actor: final deterministic verification, browser sanity check, and diff review.
- One consolidated implementation pass was used.
- A human local build found and corrected the `package.json` BOM.
- The complete local verification passed after correction.
- No separate Phase 3 checker was used.
- CodeRabbit remains the final broad PR checker.
- No auto-commit occurred.

### Phase 4 - Deployment readiness and production verification tooling

- Status: implemented offline and awaiting human cloud setup.
- Human local verification later completed successfully in normal PowerShell with `npm run verify:phase4` passing in full.
- Actor: maker Codex.
- Context and specification files used:
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
  - `api/*`
  - `server/api/*`
  - `server/session/*`
  - `scripts/*`
  - `tests/phase0/*`
  - `tests/phase1/*`
  - `tests/phase2/*`
  - `tests/phase3/*`
- Principal implementation decisions:
  - namespace split corrected so Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`; the two environments must not share a namespace when they point at the same Upstash database.
  - preserved the TanStack Start app while adding the officially supported Nitro Vite output layer, without adding `vercel.json`;
  - documented the deployed footprint as four API function entries plus one SSR entry, while keeping the preview-only Phase 0 probe in source but excluded from the deployed Vercel function count until human Preview verification;
  - remediated `/api/health` into a standalone Web Handler so Preview health checks do not depend on composition-root startup;
  - created a bounded, opt-in smoke verifier for Preview only;
  - kept the Phase 0 probe preview-only and production-blocked;
  - added offline deployment-readiness checks for configuration, docs, and sanitized artifacts;
  - recorded the human local Phase 4 verification pass, including the Nitro build and the final 4 API + 1 SSR footprint.
- Deterministic checks run by Codex:
  - `npm run lint`: PASS with the same six pre-existing React Fast Refresh warnings and no errors
  - `npm run typecheck`: PASS
  - `npm run test:phase0`: PASS
  - `npm run test:phase1`: PASS
  - `npm run test:phase2`: PASS
  - `npm run test:phase3`: PASS
  - `npm run test:phase4`: PASS
  - `npm run test:deterministic`: PASS
  - `npm run build`: FAIL in the managed Windows sandbox because Vite could not load `@tailwindcss/oxide-win32-x64-msvc` and hit `spawn EPERM` during dependency resolution
  - `npm run verify:phase4`: FAIL for the same managed-environment build limitation after all offline deterministic checks had already passed
  - human local `npm run verify:phase4`: PASS in normal PowerShell, including lint, typecheck, all Phase 0-4 tests, client build, SSR build, Nitro build, and the final Phase 4 artifact verifier
- Environment-specific limitations:
  - no Vercel import, Preview deployment, Upstash provisioning, live Emailnator request, or live smoke verification was attempted by Codex;
  - live evidence later showed the first attempted deployment was accidentally classified as Production, returned a root 404, and failed the health-only smoke size bound, so the previously assumed no-Nitro deployment shape was corrected to use Nitro Vite output;
  - the first post-build offline verifier run exposed a stale pre-Nitro client-output path, so the verifier was corrected to inspect `.output/public` for client assets while still asserting the separate Nitro server outputs;
  - the managed Windows sandbox still blocks the native Tailwind/Vite build step, so the human should treat that as an environment limitation rather than an implementation regression;
  - the human still owns cloud setup, deployment, and live-provider checks.
- Commit behavior:
  - no automatic commit or push was performed.
