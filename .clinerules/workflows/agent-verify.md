# Agent Verify

Verify a change against Vouch's requirements — build, typecheck, lint, run tests, exercise the touched FR/NFR, and report pass/fail with evidence. Use after implementing a change, before a handoff or PR, or when asked to "verify", "check it works", or "prove the requirement".

Invoked as `/agent-verify`. The argument (if any) scopes the run (a change name, requirement ID, diff ref, or slice name).

Verification pass for a Vouch change. Prove it works with evidence — never "seems to work". This is the checker half of maker ≠ checker; if you also wrote the code, run this as a fresh, critical pass.

**Steps**

1. **Scope.** `git diff --stat` (working tree) or vs `main`. List changed files and the requirement IDs they touch — grep the PRD: `grep -n "FR-\|NFR-" docs/cv-agent-requirements.md`.

2. **Static gates** (run, capture output):
   - Build: `node_modules/.bin/next build`
   - Lint: `node_modules/.bin/eslint .`
   - Note: `yarn build`/`lint` are broken — scripts point at a nonexistent `web/node_modules`. Use the bins directly (blocker tracked in `docs/current-state.md`).

3. **Tests.** If a test runner is configured, run the tests covering the diff. Pure `shared/lib` (scoring, i18n) must have unit tests (`TC-PURE-01`, `FR-CHECKLIST-01`). If there is no test for touched logic, say so — do NOT claim it is covered.

4. **Behavioral.** For each touched `FR-*`, state exactly how it was exercised (route, action, input). `BC-DEMO-01`: every FR must be exercisable on the live URL. Check the console is silent on a healthy session (`NFR-OBS-02`). For honesty-touching changes, confirm overclaim bullets stay excluded from export (`BC-HONESTY-02`).

5. **Report.** A table: `requirement/check → PASS | FAIL | SKIPPED → evidence`. Evidence = a short quote of the actual command output. No PASS without evidence. Quote failures exactly.

6. **Handoff.** Update `docs/current-state.md` last-action + next steps.

**Guardrails**
- Never report green if a gate failed or was skipped — mark it `SKIPPED` explicitly.
- Do not fix code here beyond what is needed to run the checks; report failures, let the maker fix.
- Prefer real evidence (command output) over assertion.
