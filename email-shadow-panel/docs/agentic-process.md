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
- Security posture: fixtures were labeled by provenance, raw provider HTML was not exposed in responses, and no live provider secrets were intentionally captured in repository artifacts. The independent checker later found that the local CLI detail path still prints full sanitized message text instead of only structural evidence.
- Checker status: separate checker review and CodeRabbit review are still pending future commit and PR steps.
- Next gate: human-reviewed live checks must decide the actual feasibility verdict.

### Phase 0 - Independent focused checker

- Phase: Phase 0.
- Role: independent checker.
- Model/session separation from maker: separate Codex checker session from the maker implementation session.
- Maker commit: `36e6752f374892e6166a0c40285946417ec26605`
- Review range: `1e33880ee6b75423b3635d7c50e602caeae6210b..36e6752f374892e6166a0c40285946417ec26605`
- Commands run:
  - `npm run lint` -> passed with 6 pre-existing `react-refresh/only-export-components` warnings in `src/components/ui/*`
  - `npm run typecheck` -> passed
  - `npm run test:phase0` -> passed; 17 tests passed, 0 failed; cross-process capsule write/read passed
  - `npm run build` -> failed in the managed checker environment while loading `@tailwindcss/oxide-win32-x64-msvc` and repeatedly hit `spawn EPERM`
  - `node --experimental-transform-types ./scripts/verify-phase0.ts` -> passed
- Findings summary: 1 major finding, 0 blocker, 0 minor, 0 suggestion. The local `detail` probe path still prints full sanitized message text instead of only structural evidence.
- Checker verdict: `CHANGES REQUIRED`
- Decision on whether live verification may proceed: No. Remediate the local detail-output redaction issue before human live verification.
- Confirmation that the checker did not modify implementation code: confirmed. This checker pass only updated documentation records.
- Confirmation that no live provider or Vercel action was performed: confirmed.

### Phase 0 - Maker remediation for focused checker finding

- Phase: Phase 0.
- Role: maker remediation.
- Originating checker finding: 1 Major finding from `docs/reviews/phase-0-focused-review.md`. The local CLI `detail` path printed full sanitized message text instead of only structural evidence.
- Implementation scope: fixed only the local detail-output boundary by introducing a dedicated local-detail projection and a dedicated CLI formatter. Preview redaction, provider parsing/sanitization, and live provider request behavior were left unchanged.
- Files changed for the remediation: `scripts/emailnator-probe.ts`, `server/providers/emailnator/phase0.server.ts`, `tests/phase0/local-detail-output.test.ts`, `tests/phase0/capsule.test.ts`, `docs/verification/phase-0.md`, and this process record.
- Tests added or updated: added focused regression coverage in `tests/phase0/local-detail-output.test.ts`; stabilized the pre-existing capsule tamper test in `tests/phase0/capsule.test.ts` so the full deterministic suite remains reliable.
- Commands run and actual results:
  - focused local-detail test command -> passed; 2 tests passed, 0 failed;
  - `npm run typecheck` -> passed;
  - `npm run test:phase0` -> passed; 19 tests passed, 0 failed; cross-process capsule restoration passed;
  - `npm run lint` -> passed with 0 errors and 6 pre-existing frontend warnings;
  - `npm run build` in the managed sandbox -> failed with the previously known `spawn EPERM` and Tailwind native-module limitation;
  - `npm run build` rerun outside the managed sandbox -> passed;
  - `node --experimental-transform-types ./scripts/verify-phase0.ts` -> passed;
  - `npm run verify:phase0` rerun outside the managed sandbox -> passed.
- Environment limitation: the managed Codex sandbox still cannot be treated as a reliable build environment for this repo because of the previously known Vite/Tailwind native-module and `spawn EPERM` issue.
- Live or deployment actions: none. No live Emailnator probe, no Vercel Preview probe, no deployment command, and no Phase 1 work were performed.
- Temporary-artifact closure: regenerated `.local/phase0` capsule artifacts and ignored build output were removed after deterministic verification.
- Commit behavior: no automatic commit or push was performed.
- Next gate: independent checker recheck.