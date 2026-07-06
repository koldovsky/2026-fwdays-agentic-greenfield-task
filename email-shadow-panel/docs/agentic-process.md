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

## Tooling

Selected tools for Phase 0:

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
