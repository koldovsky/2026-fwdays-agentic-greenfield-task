# Review Criteria

This file is read by the review subagent. The subagent applies only the dimensions relevant to the review target, gathers evidence for every finding, and grades severity and confidence per the rubrics below.

## Target -> Applicable Dimensions

Apply only the dimensions marked for the target type. Skipping inapplicable dimensions is required, not optional — applying spec-quality criteria to a PR produces noise.

| # | Dimension | agent-changes | diff | pr | files | project | spec | config |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Approach & Correctness | yes | yes | yes | yes | yes | — | yes |
| 2 | Completeness vs Requirements | yes | yes | yes | — | — | yes | — |
| 3 | Security | yes | yes | yes | yes | yes | yes | yes |
| 4 | Quality & Reliability | yes | yes | yes | yes | yes | — | — |
| 5 | AI-Specific Risks | yes | yes | yes | yes | — | — | — |
| 6 | Performance | yes | yes | yes | yes | yes | — | — |
| 7 | Code Quality & Conventions | yes | yes | yes | yes | yes | — | yes |
| 8 | Documentation | yes | yes | yes | — | yes | yes | — |
| 9 | Scope Discipline | yes | yes | yes | — | — | — | — |
| 10 | Architecture & Maintainability | — | — | — | yes | yes | — | — |
| 11 | Configuration & CI/CD Hygiene | — | — | — | — | yes | — | yes |
| 12 | Spec Quality | — | — | — | — | — | yes | — |
| 13 | Project Health (Audit) | — | — | — | — | yes | — | — |

## Evidence Rule

Every finding MUST include one of:

- `path/to/file:line` reference
- Exact diff hunk
- Verbatim command output (e.g. test failure, lint error, grep hit)

Findings without evidence are not posted. If you suspect an issue but cannot verify it, put it in **Unverified claims** with a description of what evidence would resolve it.

## Severity Rubric

| Severity | Meaning |
|---|---|
| **Critical** | Must fix before declaring done / merging. Correctness, security, data loss, broken builds, missing required functionality. |
| **Warning** | Should fix. Likely defects, weak tests, fragile code, unclear contracts, performance issues likely to bite in practice. |
| **Suggestion** | Consider. Improves clarity, maintainability, or robustness; not blocking. |
| **Nit** | Style/preference only. Default: do not surface unless project conventions explicitly call them out. |

## Confidence Scoring (0-100)

Borrowed from Anthropic's official code-review pattern. Score every finding:

| Score | Meaning |
|---|---|
| 100 | Verified directly. Evidence definitively confirms the issue. |
| 80-99 | High confidence. Investigated and validated; likely a real issue. |
| 50-79 | Moderate. Real issue but maybe a nit or rare in practice. |
| 25-49 | Somewhat confident. Could be a false positive. |
| 0-24 | Low. Pattern-matching without verification. |

**Threshold rule:** findings with confidence < 80 do not go in the main `Findings` section. They go in `Unverified claims` with the missing-evidence note. Surfacing low-confidence findings as findings is a known cause of false-positive noise (the "checkbox theater" problem).

## Devil's-Advocate Self-Pass

Before submitting, run an adversarial pass over your own findings.

For each finding, ask: *"Is this truly a real problem, or am I pattern-matching on something that looks bad but isn't on closer inspection?"* Mark each finding with one of:

- **KEEP** — finding stands as-is
- **WEAKEN** — finding is real but severity was overstated; lower it by one tier
- **DROP** — finding does not survive challenge; remove it

Then run a **gap pass** on the target — re-scan the diff/files/spec once more, ignoring your existing findings, and ask "what did I almost miss?" Add any new findings discovered this way to the output. Run the gap pass even when you found zero issues.

## Dimensions

### 1. Approach & Correctness

Does the chosen approach actually solve the problem?

- Logic correctness across the happy path AND edge cases (empty inputs, null/undefined, boundary values, very large inputs)
- Error paths — does the code handle them or silently swallow them?
- Concurrency: race conditions, double-execution, lost updates, deadlocks
- Off-by-one, sign errors, timezone/locale assumptions
- Idempotency where the operation should be idempotent (retries, webhooks, message handlers)
- State transitions — are all transitions valid? are forbidden transitions blocked?

Common AI failure modes: confidently writing code that compiles but does the wrong thing on the second-most-common input.

### 2. Completeness vs Requirements

Every acceptance criterion has a mapped implementation with evidence.

- Build a per-criterion table: criterion -> file:line evidence -> verdict (met / partial / missing)
- Non-goals are respected — flag any change that touches a non-goal as scope creep
- No silent feature additions ("while I was in there...")
- The PR/commit description matches what the code actually does

Common AI failure modes: claiming "done" when 6 of 7 criteria are met and the 7th is silently dropped.

### 3. Security

- **Input validation**: untrusted input is validated, type-checked, length-checked, charset-checked
- **AuthN / AuthZ**: every protected operation checks identity AND permissions; checks happen on the server, not the client
- **Secrets**: no hard-coded keys, tokens, passwords; `.env` files not committed; secrets read from env or a secret manager
- **Injection**: SQL injection (parameterized queries only), command injection (no string-concat shells), XSS (encoded output), path traversal, SSRF, prototype pollution, deserialization
- **CSRF / SameSite / CORS**: state-changing endpoints protected
- **Prompt injection**: when LLM tools consume untrusted content (web pages, issue comments, READMEs, tool outputs), is that content treated as data, not instructions? Are irreversible actions blocked behind human approval?
- **Supply chain**: new dependencies vetted (popularity, maintenance, license, supply-chain risk); lockfile updated; no `latest` or unpinned versions added
- **Logging hygiene**: no PII, tokens, or full request bodies in logs

### 4. Quality & Reliability

- Tests added or updated for behavioral changes
- Tests have meaningful assertions, not tautological ones (`expect(x).toBe(x)`, mocks asserting their own mock)
- Edge-case test coverage, not just happy path
- Error-path tests where the code has error paths
- Observability: logs, metrics, traces appropriate for the change
- Rollback: is there a way to undo this if it breaks production?
- Resource cleanup: connections closed, listeners removed, timers cleared

### 5. AI-Specific Risks

These failures show up disproportionately in AI-generated code. Look explicitly:

- **Hallucinated imports / APIs**: imports of nonexistent modules, calls to nonexistent functions, props/options that don't exist on the real type
- **Shallow happy-path tests**: tests that only assert the trivial path; no edge cases, no error cases
- **Tautological tests**: tests that pass by construction without exercising real behavior
- **Copy-paste duplication**: the same block appears in 3 places where one helper would do
- **Ignored constraints**: the spec said "do not modify X"; the diff modifies X
- **Scope creep**: refactors / formatting / unrelated changes mixed into a focused diff
- **Pattern-matching mistakes**: code that looks like a familiar pattern but does the wrong thing for this codebase's actual types/APIs

### 6. Performance

- N+1 queries (loops issuing one DB call per iteration)
- Missing indexes on new query patterns
- Synchronous / blocking calls on hot paths
- Unbounded loops, unbounded array growth, unbounded memory in caches
- Re-renders or re-computations triggered by reference instability (frontend)
- Bundle-size regressions (new heavy deps, barrel imports)
- O(n^2) or worse where O(n) would do

### 7. Code Quality & Conventions

- Compliance with `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`
- Project lint passes (run the lint command from the brief)
- Naming consistent with project conventions
- No dead code, no commented-out blocks, no `TODO`/`FIXME` left for someone else without an owner
- Functions are appropriately sized and focused
- No magic numbers without named constants

### 8. Documentation

- Public API additions/changes documented
- ADRs / specs updated when a decision was made
- Commit/PR description accurately reflects the change
- README / setup docs updated if the change affects them
- For specs: glossary, scope, acceptance criteria, non-goals are all present

### 9. Scope Discipline

- Every changed file is justified by the stated scope
- Unrelated formatting changes flagged
- Refactors mixed with feature work flagged
- Files outside the stated scope (renamed, moved, deleted) flagged

### 10. Architecture & Maintainability

(Project / files targets.)

- Module boundaries respected; no cross-layer leaks (e.g. UI calling DB directly)
- Coupling/cohesion: do related concerns live together; do unrelated concerns live apart?
- Circular dependencies (use language-appropriate tools to detect)
- Dead code (uncalled exports, unreachable branches)
- Layering: presentation / domain / data / infrastructure cleanly separated where the project claims to use this
- Public API surface — is it minimal and intentional?

### 11. Configuration & CI/CD Hygiene

(Project / config targets.)

- Pinned dependency versions (no floating ranges in production lockfiles)
- Reproducible builds (lockfile present and committed; deterministic build commands)
- Secrets via env/secret manager, never inline
- Supply-chain scans configured (npm audit, pip-audit, dependabot, etc.)
- CI runs lint + typecheck + tests on every PR
- Deploy steps are reversible / have rollback
- Branch protection enforces CI green before merge (best-effort observation)
- `.gitignore` / `.cursorignore` exclude sensitive files

### 12. Spec Quality

(Spec target only.)

- Scope is bounded and explicit
- Acceptance criteria are testable (each one maps to a verifiable check)
- Non-goals are listed
- Edge cases enumerated
- Constraints listed (performance, security, compatibility)
- Glossary / definitions for domain terms
- Open questions explicitly called out, not buried
- Specifies what "done" means

### 13. Project Health (Audit)

(Project target only.)

- `AGENTS.md` exists at repo root and is current
- README is AI-consumable: structure, key paths, build/test commands
- Test runner is configured and tests can run (`npm test` / `pytest` / etc.)
- Coverage signals visible (coverage report, badge, or CI step)
- Dependencies are not severely stale (check for major-version-behind frameworks)
- Security posture: no committed secrets, no obvious vulnerabilities in lockfile (`npm audit`, equivalent)
- Conventions documented (file/folder layout, naming)
- CI exists and is healthy (recent runs green)

## Final Reminders for the Subagent

- You have NOT seen the implementation conversation. Do not assume good intent or correct prior reasoning.
- Cite evidence for every finding. No evidence -> Unverified claims.
- Run the devil's-advocate pass and the gap pass before submitting.
- Submit only the format in `OUTPUT_FORMAT.md`. No preamble, no apologies, no "hope this helps".
