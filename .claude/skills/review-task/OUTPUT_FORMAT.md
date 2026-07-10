# Output Format

The review subagent MUST emit exactly this markdown structure. No conversational preamble, no closing pleasantries, no "I hope this helps". The output IS the deliverable.

## Required Schema

````markdown
## Review target
<target type> — <one-line scope summary>

Examples:
- `pr — PR #482, "feat: add SSO login", base main, head feat/sso`
- `agent-changes — 7 files in src/auth/* and src/middleware/auth.ts`
- `project — full audit of the codebase, focus: AI-readiness`
- `diff — git diff main..HEAD, 12 commits, 23 files`

## Verdict
APPROVE | APPROVE_WITH_CHANGES | REQUEST_CHANGES | BLOCK

## Summary
<1-3 sentences describing the most important conclusion. No hedging. State the verdict's reason.>

## Risk score
<integer 1-10>

Risk score guidance:
- 1-3: low risk (style, minor suggestions, no functional concerns)
- 4-6: medium risk (warnings, fixable defects, weak tests)
- 7-8: high risk (security, correctness, or scope issues)
- 9-10: do-not-merge (data loss, broken auth, missing required functionality)

## Dimensions applied
<comma-separated dimension names from CRITERIA.md, e.g. "Approach & Correctness, Security, Quality & Reliability, Documentation">

## Findings

### F1 — <short imperative title, e.g. "Missing authorization check on /api/users/:id">
- **Severity**: Critical | Warning | Suggestion
- **Category**: <dimension name from CRITERIA.md>
- **Confidence**: <0-100>
- **Evidence**: <file:line OR command output OR diff hunk — required>
- **Why it matters**: <1-2 sentences>
- **Recommended fix**: <concrete change, OR "describe and let author choose" if multiple valid approaches>
- **DA verdict**: KEEP | WEAKEN | DROP — <one-line reason>

### F2 — <title>
- ...

(Repeat for each finding. Number sequentially. If zero findings, write "_None — see Gap pass below._")

## Unverified claims (confidence < 80)
<Findings you suspect but could not verify. Each line: brief description — what evidence would resolve it.>

- <item> — <missing evidence>

(If none, write "_None._")

## Gap pass (things I almost missed)
<Run after the main pass. Re-scan the target ignoring existing findings. Even if zero findings above, do this pass.>

- <item> — <evidence> — <severity>

(If none, write "_None._")

## Next steps
<Ordered list. Be concrete. Each step references a finding ID where applicable.>

1. <step — references F1, F3>
2. <step>
````

## Optional: Strengths Section

For `project` and `spec` targets only, append a `## Strengths` section after `Next steps` listing what is working well. Strengths are noise in change reviews (`agent-changes`, `diff`, `pr`, `files`, `config`) — do NOT include the section there.

````markdown
## Strengths
- <one bullet per genuine strength, with evidence>
````

## Verdict Rules

The verdict is derived mechanically from the findings, not from a feeling.

| Verdict | When |
|---|---|
| `APPROVE` | Zero Critical, zero Warning. Suggestions only or no findings. |
| `APPROVE_WITH_CHANGES` | Zero Critical, one or more Warnings. Author should address but the change is directionally fine. |
| `REQUEST_CHANGES` | One or more Critical findings, but the change is salvageable with fixes. |
| `BLOCK` | Critical findings that indicate the wrong approach, security breach, data loss, or violated non-goal. The change should not proceed in its current shape. |

For `project` audits, treat:
- `APPROVE` as "healthy"
- `APPROVE_WITH_CHANGES` as "healthy with action items"
- `REQUEST_CHANGES` as "significant gaps to address"
- `BLOCK` as "fundamentally unhealthy in the audited dimension(s)"

## Formatting Rules

- All file references use `path/to/file:line` (with line, when applicable)
- Code/diff in evidence is in fenced blocks
- Severity, Category, Confidence, DA verdict labels are bolded
- Findings are numbered F1, F2, F3, ... in order of decreasing severity then decreasing confidence
- Do NOT add extra top-level sections
- Do NOT use emojis
- Do NOT use first-person ("I think") in findings — state the issue directly

## Anti-Patterns in Output

- "Overall the code looks good but..." — banned. State the verdict directly.
- "There may be a potential issue with..." — banned. Either you have evidence or it goes in Unverified claims.
- "Consider potentially adding..." — banned. Either it's a Suggestion with a concrete fix or it's not a finding.
- Findings without `Evidence` — banned. Move to Unverified claims.
- Same finding posted twice — banned. Deduplicate before submitting.
- Closing remarks like "Let me know if you have questions" — banned. The output is structured; the parent agent handles dialogue.
