# Agentic Process Record

## Project Context

Email Shadow Panel is the course project for Agentic Engineering: Greenfield. The repository must show context engineering, specifications before implementation, verification loops, maker/checker separation, and honest evidence.

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

Codex is expected to inspect repositories, implement approved phase specifications, add tests, run verification, and summarize changes and risks.

## Human Responsibilities

The human approves architecture, performs provider and deployment checkpoints, sends the manual test email when a later live run is approved, evaluates product UX, reviews findings, records the demo video, and submits the PR.

## Context-Engineering Approach

Stable context belongs in `AGENTS.md` files. Dynamic phase-specific context belongs in `docs/tasks/`. Completed factual results belong in `docs/verification/` and this process record.

## Planned Engineering Loop

For each phase, Codex will read context, inspect the repository, map acceptance criteria, implement the smallest coherent change, run focused checks, diagnose failures, fix issues, run phase verification, review against criteria, and record actual results.

## Maker/Checker Strategy

- Maker: this Codex implementation session for Phase 0.
- Checker: a separate review session after implementation.
- Deterministic tests: run before claiming readiness for human verification.
- CodeRabbit: PR review after changes are pushed in a later step.
- Human: approval gates before live probing, deployment checks, and final submission.

## Tooling

Currently selected tools:

- Codex in the local workspace.
- Git.
- npm scripts from the existing project.
- Native Node.js runtime pinned to major 22 for this phase.
- Vercel Preview in later approved phases.
- CodeRabbit PR review in a later step.

No MCP was necessary for Phase 0 implementation. Playwright is not part of required verification.

## Phase Log

### Phase 0 - Emailnator HTTP feasibility

- Status: Implemented locally, PENDING HUMAN VERIFICATION.
- Spec baseline: `docs/tasks/phase-0-provider-feasibility.md` plus the approved amendment list from 2026-07-05.
- Context gathered before implementation: repository structure, existing frontend/tooling, Node runtime check (`v22.20.0`), and low-volume public-reference-derived inspection of Emailnator public assets.
- Public-reference-derived findings: public assets referenced cookie names `XSRF-TOKEN` and `gmailnator_session`, `POST /generate-email`, and `POST /message-list` with detail keyed by `messageID`. These findings were not treated as live proof.
- Implementation results: added a fixed-origin Emailnator provider adapter, capsule sealing and restoration helpers, a Preview-only Vercel probe handler, deterministic fixtures, a server-boundary import test, and focused Node-only TypeScript and ESLint scope.
- Verification loop: ran lint, typecheck, Phase 0 tests, build, and artifact checks; fixed formatting and a probe-test input issue; reran the suite until deterministic tests passed.
- Deterministic verification results: `npm run test:phase0` passed with 17 of 17 tests, cross-process capsule restoration passed in a fresh Node process, and the sensitive-artifact verification script passed.
- Environment note: the first complete `npm run verify:phase0` attempt inside the managed Codex sandbox failed because Vite hit `spawn EPERM`. The human reran the same full command in a normal local terminal, and it passed without any source-code change. This distinguished an environmental tool restriction from an implementation defect.
- Dependency-lock maintenance note: a later pass found that the root `package-lock.json` metadata was out of sync with `package.json` for `tough-cookie`, `engines.node`, and stale `tsx`. A lock-only npm refresh repaired the metadata, `npm ci --ignore-scripts` then passed, and a full `npm run verify:phase0` rerun passed again outside the managed sandbox. No Phase 0 source-code change was needed beyond the lockfile repair.
- Live verification status: no live inbox generation, live message retrieval, Preview deployment probe, or manual test-email checkpoint was run in this pass by instruction.
- Security posture: fixtures were labeled by provenance, raw provider HTML was not exposed in responses, message detail output was reduced to sanitized structural evidence, and no live provider secrets were intentionally captured in repository artifacts.
- Checker status: separate checker review and CodeRabbit review are still pending future commit and PR steps.
- Next gate: human-reviewed live checks must decide the actual feasibility verdict.
