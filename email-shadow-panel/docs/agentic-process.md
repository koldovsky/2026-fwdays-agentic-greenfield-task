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
