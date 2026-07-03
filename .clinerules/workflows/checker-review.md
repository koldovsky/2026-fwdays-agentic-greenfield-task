# Checker Review

Independent maker≠checker review of a Vouch diff — audits against PRD requirement IDs, DESIGN.md brand rules, FSD import rules, and NFRs. Use before merging, on "review this diff/PR", or as a second pass after implementing. Produces findings, not code.

Invoked as `/checker-review`. The argument (if any) scopes the run (a change name, requirement ID, diff ref, or slice name).

Adversarial review pass. You are the checker, not the maker — even if you wrote this code, read it as a fresh, skeptical reviewer. Output findings; do not rewrite the code.

**Steps**

1. **Get the diff.** `git diff` (working tree) or `git diff main...HEAD`.

2. **Requirements.** Does the change satisfy the claimed `FR-*` / `NFR-*`? Cite IDs from `docs/cv-agent-requirements.md`. Flag scope creep and unmet acceptance criteria.

3. **Honesty** (if it touches tailoring / bullets / checklist): grounding must be a **separate second LLM pass** with no shared context (`FR-BULLETS-03`); overclaim-risk bullets **excluded from export by default** and never silently re-included (`BC-HONESTY-01/02`). Non-negotiable.

4. **Architecture.** FSD import rule (imports go downward only), slice `index.ts` public API respected, no deep cross-slice imports, `shared/lib` framework-free (`TC-PURE-01`). See `docs/system-design.md`.

5. **Design** (if UI): `docs/DESIGN.md` — no new brand hues, no emoji / exclamation points, tokens via Tailwind `@theme`, Bricolage/Hanken fonts. Accessibility: visible focus + accessible names (`NFR-A11Y-01`).

6. **Privacy / security** (if relevant): CV encrypted at rest, no user IDs in LLM payloads (`NFR-SEC-01/02`); no third-party trackers (`BC-PRIVACY-01`).

7. **Report.** One finding per line: `path:line: <severity>: problem. → fix.` Severity = `blocker` / `major` / `minor`. End with a verdict: **ship** or **fix-first**, and the blocker count. No praise, no nits that don't change meaning.

**Guardrails**
- Review only — do not edit files.
- Every finding cites a requirement ID or a concrete rule; no vibes.
- If you can't verify a claim from the diff, say so rather than assume.
