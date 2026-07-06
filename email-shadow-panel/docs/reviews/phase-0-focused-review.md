# Phase 0 Focused Review

## Reviewer role and scope

- Reviewer role: independent checker in a separate Codex session from the maker session.
- Scope: review Phase 0 implementation commit `36e6752f374892e6166a0c40285946417ec26605` against the approved Phase 0 specification baseline and verify focused controls around redaction, session handling, Preview gating, deterministic checks, and repository artifact safety.

## Specification baseline commit

- `1e33880ee6b75423b3635d7c50e602caeae6210b`

## Maker implementation commit

- `36e6752f374892e6166a0c40285946417ec26605`

## Review range

- `1e33880ee6b75423b3635d7c50e602caeae6210b..36e6752f374892e6166a0c40285946417ec26605`

## Files and areas inspected

- `scripts/emailnator-probe.ts`: local probe flow, manual checkpoint, and output redaction behavior.
- `server/providers/emailnator/provider.server.ts`: fixed-origin transport, request bounds, response classification, and detail sanitization.
- `server/providers/emailnator/phase0.server.ts`: capsule restore and probe action outputs.
- `server/providers/emailnator/probe.server.ts`: Preview-only route gates and bearer-token enforcement.
- `server/providers/emailnator/capsule.server.ts` and `schemas.server.ts`: capsule sealing, TTL, and request/state validation.
- `tests/phase0/boundary.test.ts`, `tests/phase0/probe.test.ts`, `tests/phase0/provider.test.ts`: deterministic coverage for boundaries, Preview redaction, parsing, transport, and capsule behavior.
- `tests/fixtures/emailnator/README.md`, `scripts/verify-phase0.ts`, `.gitignore`, `.env.example`: fixture provenance, artifact scanning, ignore rules, and example configuration safety.
- `package.json`, `eslint.config.js`, `api/_probe/emailnator.ts`: required scripts, lint/type boundaries, and Preview route entrypoint.

## Checker-run commands and actual results

- `git diff --name-only 1e33880ee6b75423b3635d7c50e602caeae6210b..36e6752f374892e6166a0c40285946417ec26605 -- email-shadow-panel` -> listed 36 changed Phase 0 files.
- `git diff --stat 1e33880ee6b75423b3635d7c50e602caeae6210b..36e6752f374892e6166a0c40285946417ec26605 -- email-shadow-panel` -> reported 36 files changed, 2910 insertions, 81 deletions.
- `npm run lint` -> passed with 6 pre-existing `react-refresh/only-export-components` warnings in `src/components/ui/*`; 0 errors.
- `npm run typecheck` -> passed.
- `npm run test:phase0` -> passed; 17 tests passed, 0 failed; cross-process capsule write/read also passed.
- `npm run build` -> failed in the managed checker environment while loading `@tailwindcss/oxide-win32-x64-msvc` and repeatedly hit `spawn EPERM`.
- `node --experimental-transform-types ./scripts/verify-phase0.ts` -> passed; Phase 0 artifact and sensitive-value checks passed.

## Previously human-run evidence

- Existing human-run evidence already recorded in `docs/verification/phase-0.md`: `npm run verify:phase0` passed in a normal local Git Bash terminal outside the managed Codex sandbox.

## Focused checklist

| Item | Status | Evidence |
| --- | --- | --- |
| Fixed Emailnator origin, bounded request size, timeout handling, and provider error classification | Verified | Reviewed in `server/providers/emailnator/provider.server.ts`; deterministic transport tests passed. |
| Preview-only probe gate and bearer-token requirement | Verified | Reviewed in `server/providers/emailnator/probe.server.ts`; probe tests passed. |
| Session capsule sealing and cross-process restoration | Verified | Reviewed in `capsule.server.ts` and `phase0.server.ts`; capsule tests and cross-process scripts passed. |
| Browser/server architecture boundary | Verified | `tests/phase0/boundary.test.ts` passed; Preview handler remains in `api/_probe/emailnator.ts` with `runtime = "nodejs"`. |
| Committed fixture and artifact redaction | Verified | `scripts/verify-phase0.ts` passed; fixture provenance file labels sources and committed artifacts remained free of detected secrets. |
| Local probe prints only redacted structural evidence | Failed | `scripts/emailnator-probe.ts` prints `result.localText`, and `runDetailAction` supplies that full sanitized message text. This conflicts with the spec requirement to print only redacted structural evidence. |
| Full deterministic end-to-end verification in this checker environment | Partially verified | Lint, typecheck, tests, and artifact scan passed, but `npm run build` failed in the managed checker environment. |
| Live bootstrap, generation, list, detail, session restore, and Preview feasibility against the real provider | Pending human verification | No live provider or Vercel action was run in this checker pass. |

## Findings

### Blocker

- None.

### Major

- Local probe detail output violates the redaction requirement. `scripts/emailnator-probe.ts:101-105` prints `result.localText`, and `server/providers/emailnator/phase0.server.ts:94-103` includes that full sanitized message text in the local detail action result. The Phase 0 spec requires the local probe to "print only redacted structural evidence" in `docs/tasks/phase-0-provider-feasibility.md:92-95`. This would expose real message body text during human live verification instead of limiting output to structural evidence.

### Minor

- None.

### Suggestion

- None.

## Sensitive-data assessment

- Checker-run artifact scanning found no committed raw cookies, XSRF values, bearer tokens, active inbox addresses, or message bodies.
- The repository artifact posture is acceptable based on the checker-run scan and inspected fixture provenance.
- Runtime local-probe redaction is not yet acceptable for human live verification because the `detail` path currently prints full sanitized message text to the terminal.

## Dependency reproducibility assessment

- The current installed dependency set was sufficient for checker-run lint, typecheck, tests, and artifact scanning.
- The checker did not reproduce a full successful `npm run verify:phase0` run in the managed environment because `npm run build` failed with `[UNLOADABLE_DEPENDENCY]` and `spawn EPERM`.
- Previously recorded human-run evidence shows a successful end-to-end `npm run verify:phase0` run outside the managed sandbox, but that evidence was not reproduced in this checker session.

## Architecture-boundary assessment

- Browser/server boundaries remained intact in the reviewed commit.
- The boundary test passed, and the Preview route entrypoint stays narrow: `api/_probe/emailnator.ts` exports only the Node runtime POST handler into the server-side implementation.
- No reviewed `src/` import path crossed into `server/`, `api/`, or `scripts/` according to the deterministic boundary test result.

## Remaining human live-verification requirements

- Remediate the local probe detail-output redaction issue before starting live verification.
- After remediation and approval, run the low-volume local live probe with a harmless manual test email to verify bootstrap, generate, list, detail, and session restoration against the real provider.
- Run the protected Vercel Preview probe against the real provider.
- Record whether the live provider and Vercel checks succeed, fail, or encounter challenge/blocking behavior.

## Final checker verdict

- `CHANGES REQUIRED`
- The implementation is not cleared for human live verification in its current form.
