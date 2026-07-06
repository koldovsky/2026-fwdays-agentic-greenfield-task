# Phase 0 Verification

## Status

PENDING HUMAN VERIFICATION

## Phase Objective

Prove whether the complete required Emailnator workflow can run through server-side HTTP requests locally and from Vercel Preview without browser automation or bypassing provider controls.

## Deterministic Commands Run

- `node --version` -> `v22.20.0`
- `npm --version` -> `11.6.1`
- Codex-run checks in the managed sandbox:
  - `npm run lint` -> passed with 6 existing `react-refresh/only-export-components` warnings under `src/components/ui/*`
  - `npm run typecheck` -> passed
  - `npm run test:phase0` -> passed, 17 tests passed, 0 failed
  - `npm run build` -> passed when rerun outside the managed sandbox after the first sandbox-only failure path was isolated
  - `node --experimental-transform-types ./scripts/verify-phase0.ts` -> passed
- Human-run complete deterministic verification in a normal local Git Bash terminal outside the managed Codex sandbox:
  - `npm run verify:phase0` -> passed
- Codex-run dependency-lock repair and reproducibility verification outside the managed sandbox:
  - `npm pkg get dependencies.tough-cookie devDependencies.tsx engines.node` -> `package.json` reported `tough-cookie = 6.0.0`, `engines.node = 22.x`, and no `devDependencies.tsx`
  - `node -e "...package-lock root metadata..."` -> confirmed the stale mismatch before repair: `tough-cookie` missing, `tsx = ^4.20.6`, `engines.node` missing
  - `npm install --package-lock-only --ignore-scripts` -> passed and repaired the lock metadata
  - `npm ci --ignore-scripts` -> passed after the repair
  - `npm run verify:phase0` -> passed after the clean install

## Complete Local Deterministic Verification

`npm run verify:phase0` was rerun by the human in the normal local Git Bash environment outside the managed Codex sandbox.

Result: Passed.

The command completed:

- ESLint with 0 errors and 6 pre-existing frontend warnings.
- Frontend and Phase 0 TypeScript checks.
- 17 of 17 Phase 0 tests.
- Cross-process capsule restoration in a fresh Node process.
- Vite client and SSR production builds.
- Phase 0 artifact and sensitive-value checks.

This successful run is human-executed verification evidence. Codex did not run that successful normal-terminal command.

## Dependency-Lock Repair And Reproducibility Verification

A later Phase 0 maintenance pass found that `package.json` and the root `package-lock.json` metadata were out of sync.

Before repair:

- `package.json` declared `dependencies.tough-cookie = 6.0.0`
- `package.json` declared `engines.node = 22.x`
- `package.json` did not declare `devDependencies.tsx`
- the root lockfile metadata still omitted `tough-cookie`
- the root lockfile metadata still omitted `engines.node`
- the root lockfile metadata still retained `devDependencies.tsx = ^4.20.6`

Repair and reproducibility results:

- `npm install --package-lock-only --ignore-scripts` repaired the root lockfile metadata.
- The repaired root lockfile metadata now reports `tough-cookie = 6.0.0`, no root `tsx`, and `engines.node = 22.x`.
- `npm ci --ignore-scripts` then completed successfully against the repaired lockfile.
- `npm run verify:phase0` completed successfully after that clean install.

This repair pass confirmed that the Phase 0 dependency lock is now aligned with `package.json` and supports a reproducible installation path.

## Deterministic Results

- Node major was pinned to `22.x` in `package.json` after confirming the local runtime was Node 22.
- The provider adapter uses a fixed Emailnator origin and a single tested multi-cookie helper around `Headers.getSetCookie()`.
- The Preview probe uses Vercel's Web handler format with `export async function POST(request: Request): Promise<Response>`.
- Server-only TypeScript scope was isolated to `tsconfig.phase0.json` and scoped ESLint overrides; frontend browser files were not broadly given Node globals.
- The import-boundary test proved that browser code under `src/` does not import from `server/`, `api/`, or `scripts/`.
- Deterministic capsule restore succeeded across separate Node processes using a written fixture and a fresh reader process.
- The Preview detail response path returns only sanitized structural evidence: content type, body length, sanitized text preview, and marker presence. The independent checker later found that the local CLI detail path still prints full sanitized message text and requires remediation before live verification.
- Phase 0 artifact and sensitive-value scanning passed.
- The complete local deterministic verification command now passes in the normal local terminal.
- The dependency lock was repaired so the root lockfile metadata now matches `package.json`.
- A clean `npm ci --ignore-scripts` succeeded after the repair.
- A post-repair full `npm run verify:phase0` run also succeeded outside the managed sandbox.

## Environment-Specific Failure

The first `npm run verify:phase0` attempt inside the managed Codex sandbox failed when Vite encountered `spawn EPERM`.

The same complete command later passed in the normal local terminal. No source-code correction was required for the build.

A later lockfile repair attempt inside the managed sandbox also hit environment restrictions: npm could not use the default cache path and then could not resolve uncached package metadata without network access.

## Public-Reference-Derived Research

The following observations came from low-volume inspection of public Emailnator page and client assets only. They are useful for adapter design but do not prove the live provider contract.

- Public assets referenced cookie names `XSRF-TOKEN` and `gmailnator_session`.
- Public assets referenced `POST /generate-email`.
- Public assets referenced `POST /message-list` for message listing.
- Public assets suggested detail retrieval also uses `POST /message-list` with a `messageID` field.

## Local Live-Probe Results

Not run in this implementation pass by instruction. No live inbox was generated. No live messages were retrieved.

## Cross-Process Restoration Result

Deterministic local proof passed: a sealed capsule written in one Node process was restored successfully in a fresh Node process.

This is not yet proof that a live provider session survives process boundaries. That remains pending human verification.

## Vercel Preview Results

Not run yet. The Preview probe implementation exists, but no Preview deployment or Preview probe invocation was performed in this pass.

## Sensitive-Data Review

- `tests/fixtures/emailnator/README.md` documents fixture provenance as `synthetic`, `public-reference-derived`, or `live-sanitized`.
- Phase 0 artifact and sensitive-value checks passed.
- No live inbox addresses, personal sender addresses, raw provider HTML, raw capsules, or raw live message bodies were intentionally captured in repository artifacts during this pass.

## Failures Encountered

- The first `npm run verify:phase0` attempt failed only inside the managed Codex sandbox because `vite build` hit `spawn EPERM` during dependency resolution.
- Phase 0 files initially needed targeted Prettier cleanup before lint passed.
- A later lockfile repair attempt inside the managed sandbox failed because npm could not use the default cache path and could not resolve uncached package metadata without network access.

## Corrections Made

- Applied targeted Prettier formatting to the new and changed Phase 0 files.
- Isolated the build failure as environmental rather than a source-code defect.
- Reran deterministic tests after fixing the last malformed probe-test input.
- Recorded the later human-run successful full verification result.
- Repaired the root `package-lock.json` metadata with a lock-only npm refresh.
- Confirmed reproducible installation with `npm ci --ignore-scripts`.
- Reran the full deterministic verification after the lock repair.

## Unverified Claims

The following remain unverified and must not be treated as proven by this Phase 0 implementation pass:

- Live provider bootstrap from this adapter.
- Live cookie rotation behavior.
- Live inbox generation.
- Live message listing.
- Live message-detail retrieval.
- Live provider-session restoration after real stateful operations.
- Vercel Preview network compatibility against the real provider.

## Final Acceptance-Criteria Table

| Criterion | Result | Evidence |
| --- | --- | --- |
| Provider bootstrap | Pending human verification | Deterministic bootstrap-path code and validation exist; no live bootstrap run was performed. |
| Cookie and XSRF handling | Partially evidenced, pending human verification | Multi-cookie helper and cookie-jar tests passed; public assets referenced `XSRF-TOKEN` and `gmailnator_session`. |
| Inbox generation | Pending human verification | Deterministic request and schema handling implemented; no live generation run was performed. |
| Message listing | Pending human verification | Deterministic parsing against synthetic fixtures passed; no live listing run was performed. |
| Message-detail retrieval | Pending human verification | Deterministic structural sanitization passed; no live detail run was performed. |
| Session serialization and restoration | Partially evidenced, pending human verification | Cross-process capsule restore passed locally, the full human-run deterministic verification command passed, and the post-repair Codex-run `npm run verify:phase0` command passed; live provider-session restore was not run. |
| Vercel Preview compatibility | Pending human verification | Preview-only probe was implemented; no Preview deployment check was run. |
| Deterministic tests | Passed | `npm run test:phase0` passed with 17 of 17 tests, the human-run `npm run verify:phase0` command passed end to end, and the post-repair Codex-run `npm run verify:phase0` command passed after a clean `npm ci --ignore-scripts`. |
| Sensitive-data review | Passed | Phase 0 artifact and sensitive-value checks passed during both the human-run complete verification and the post-repair Codex-run verification. |

## Independent focused checker

- Checker role: independent checker in a separate Codex session from the maker session.
- Maker commit reviewed: `36e6752f374892e6166a0c40285946417ec26605`
- Commit range: `1e33880ee6b75423b3635d7c50e602caeae6210b..36e6752f374892e6166a0c40285946417ec26605`
- Deterministic commands run by checker:
  - `npm run lint` -> passed with 6 pre-existing `react-refresh/only-export-components` warnings in `src/components/ui/*`
  - `npm run typecheck` -> passed
  - `npm run test:phase0` -> passed; 17 tests passed, 0 failed; cross-process capsule write/read passed
  - `npm run build` -> failed in the managed checker environment while loading `@tailwindcss/oxide-win32-x64-msvc` and repeatedly hit `spawn EPERM`
  - `node --experimental-transform-types ./scripts/verify-phase0.ts` -> passed
- Actual checker results:
  - Checker-confirmed deterministic checks passed for lint, typecheck, tests, and artifact scanning.
  - Checker did not reproduce a full successful build in the managed environment.
- Findings by severity: 0 blocker, 1 major, 0 minor, 0 suggestion.
- Final checker verdict: `CHANGES REQUIRED`
- Cleared for human live verification: `No`
- Checker finding summary: the local `npm run probe:emailnator -- detail` path still prints full sanitized message text via `localText`, so the implementation does not yet meet the Phase 0 requirement to print only redacted structural evidence.

## Final Verdict

Verdict: PENDING HUMAN VERIFICATION

Phase 0 implementation and deterministic validation are complete enough for the independent checker pass and for reviewed human live checks, but the feasibility verdict must remain pending until the approved live provider and Vercel Preview checks are performed.
