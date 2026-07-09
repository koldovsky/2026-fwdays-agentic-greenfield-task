# Tasks: harden-agentic-loop

## 1. C3 — CI workflow
- [x] 1.1 `.github/workflows/ci.yml`: triggers on `push` + `pull_request`; node 20; yarn
      `install --frozen-lockfile`; steps `lint → typecheck → build → test → node scripts/check-review-findings.mjs`.
- [x] 1.2 Add a `typecheck` script (`tsc --noEmit`) to `package.json` and run it in CI after lint.
- [x] 1.3 `next build` reads env lazily (request-time), so the build step sets NO env — keeping the
      workflow free of anything resembling a committed secret.

## 2. C3 — Blocking Stop hook
- [x] 2.1 `current-state-stop-check.sh`: before the handoff check, if the working tree has
      changed `.ts/.tsx/.js/.mjs` files, run `yarn lint`; on non-zero, emit
      `{"decision":"block", ...}` with the eslint failure tail. Keep the `stop_hook_active` guard.
- [x] 2.2 Preserve the existing `docs/current-state.md` staleness block after the lint gate.
- [x] 2.3 Raise the `Stop` hook timeout in `.claude/settings.json` (15s → 120s) so lint fits.

## 3. C5 — review-findings artifact
- [x] 3.1 `.claude/review-findings.schema.json`: draft-07 schema (change, reviewer, date,
      commit, verdict[ship|fix-first], blockers/majors/minors, requirementIds, findings[]).
- [x] 3.2 `scripts/check-review-findings.mjs`: zero-dep Node validator; scans
      `openspec/changes/**/review-findings.json` + `.claude/reviews/*.json`; validates shape;
      exit 1 on malformed, 0 otherwise (0 files = pass with note).
- [x] 3.3 Update `.claude/agents/checker.md` + `.claude/skills/checker-review/SKILL.md`:
      after reporting, WRITE `review-findings.json` for the reviewed change (path convention +
      schema reference). Read-only-on-code preserved (writes only the findings artifact).

## 4. Verify + review (separate contexts)
- [x] 4.1 `verifier` subagent: `yarn lint`, `yarn build`, `yarn test`, run the new validator,
      dry-run the upgraded Stop hook (lint-fail path blocks, clean path passes), lint the YAML.
- [x] 4.2 `checker` subagent (fresh context): review the whole diff vs this proposal + AGENTS.md
      process rules; emit `.claude/reviews/harden-agentic-loop.json` (dogfoods 3.x).
- [x] 4.3 Fix any blocker, re-verify, commit. Update `docs/current-state.md`.
