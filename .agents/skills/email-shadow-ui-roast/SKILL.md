---
name: email-shadow-ui-roast
description: Constructively roast and prioritize the Email Shadow Panel generation, transition, and inbox UI, then produce a detailed Codex implementation prompt. Use for iterative UI/UX audits, visual polish reviews, accessibility reviews, or post-implementation design QA of Email Shadow Panel. Do not use for backend, provider, Redis, API, deployment, or security implementation.
---

# Email Shadow UI Roast

Use this skill only when explicitly invoked. Audit the Email Shadow Panel UI, produce an evidence-based constructive roast, prioritize a realistic polish batch, and generate one copy-paste-ready Codex implementation prompt for a separate implementation chat.

Do not implement recommendations, deploy, commit, or push unless the user explicitly asks in a later message.

## Required Reference

Before scoring or writing the final review, read `references/review-rubric.md`. Use it for the required surfaces, state checklist, priorities, evidence rules, and output acceptance checks.

## Workflow

1. Establish boundaries.
   - Inspect root and project-level `AGENTS.md`.
   - Inspect current Git status.
   - Inspect `package.json`.
   - Inspect relevant architecture and Phase 3/4 documentation.
   - Discover existing UI source files, design tokens, global styles, and frontend tests before assuming names.
   - Keep application work inside `email-shadow-panel` unless repository instructions say otherwise.

2. Protect working behavior.
   - Do not recommend changes to Emailnator integration, provider contracts, Nitro routing, public API contracts, session encryption, capability tokens, visitor hashing, Upstash persistence, abuse controls, polling semantics, localStorage session schema, message-safety guarantees, or deployment configuration.
   - If a visible UX issue directly requires touching one of those boundaries, flag it as a narrowly scoped exception instead of silently broadening scope.

3. Gather visual evidence in priority order.
   - First use screenshots supplied by the user.
   - Then use a current browser-rendered app when browser tools are available.
   - Then use a locally rendered app.
   - Then use source-code inspection.
   - Then use documentation and previous screenshots.
   - Never claim to have visually inspected a state that was not rendered or provided. When visual evidence is unavailable, continue with source-based review, label visual conclusions as provisional, and state exactly which screenshots or states would improve confidence.

4. Inspect relevant source.
   - Discover actual file names with `rg --files`, `rg`, or equivalent.
   - Likely areas include routes, `AppShell`, generation screen components, transition/loading components, mailbox screen components, address card, recent sessions, message list, message preview, detected-code card, status banners, controller hooks/state, global CSS, Tailwind config, and frontend tests.
   - Read only files needed for the review.

5. Review the three required surfaces.
   - Generation screen: first visit, Generate Inbox CTA, recent inboxes, product explanation, trust signals, initial/loading/failure/retry states.
   - Transition screen: between generation and mailbox readiness, animation, progress communication, timing, anticipation, reduced motion, failure, fast and slow requests, double-generation prevention.
   - Inbox screen: generated address, copy action, recent inbox switching, message list, empty/loading/error states, selection, preview, detected verification code, refresh, delete/forget, and responsive behavior.
   - Include keyboard-only use, focus visibility, reduced motion, contrast, text wrapping, and long generated addresses.

6. Roast constructively.
   - Be sharp and humorous, but never insult the developer.
   - For every roast, provide concrete evidence, why it hurts comprehension/confidence/task completion, and a practical correction.
   - Avoid vague feedback such as "make it modern", "improve spacing", "make it pop", or "clean up the UI".
   - Identify exact component or region, current problem, desired behavior, and acceptance criterion whenever possible.

7. Prevent redesign drift.
   - Preserve the existing Email Shadow Panel identity unless evidence shows a visual decision is actively harmful.
   - Prefer the smallest coherent polish pass with the highest user impact.
   - Do not recommend a whole-product redesign, a new design system, decorative dashboards, novelty components, excessive glassmorphism/gradients/glow/borders/animations, ambiguous icon-only hiding of important actions, or spectacle over inbox usability.

8. Prioritize.
   - Use P0, P1, P2, and P3 priorities from the rubric.
   - Include priority, screen, affected component/file when known, evidence, user impact, correction, complexity, and acceptance criteria for each recommendation.
   - Keep the implementation batch to at most 10 coherent changes, ordered by product value rather than visual novelty.

9. Generate the implementation prompt.
   - Produce exactly one complete prompt in the `# Codex Implementation Prompt` section.
   - Put the prompt inside a single fenced code block.
   - Make it usable in a new Codex chat without the audit conversation.
   - Include only the prioritized polish batch, not every roast finding.
   - Tell Codex to inspect before editing and adapt file names to the actual repository.
   - Require existing tests and manual browser evidence; do not require Playwright by default.
   - Do not require live Emailnator smoke for purely visual changes unless generation, polling, detail, or removal behavior changes.

## Required Output Structure

Use these exact top-level headings:

```markdown
# UI/UX Roast Verdict
# What Already Works
# Generation Screen Roast
# Transition Screen Roast
# Inbox Screen Roast
# Cross-Screen Issues
# Prioritized Polish Batch
# Preserve These Decisions
# Deferred Ideas
# Codex Implementation Prompt
# Evidence Needed for the Next Iteration
```

For each finding under screen-specific roast sections, use:

```markdown
- Roast
- Evidence
- Why it matters
- Recommended correction
- Priority
- Complexity
```

The verdict must include a concise memorable assessment and a current score out of 10, explained without fake precision.

The prioritized polish batch must be a table with at most 10 rows:

```markdown
| Order | Priority | Improvement | Screen/component | User value | Complexity |
```

The implementation prompt must include role, repository path, branch guidance, objective, verified product context, exact approved improvements, likely files to inspect, behaviors to preserve, explicit non-goals, accessibility requirements, responsive requirements, animation/reduced-motion requirements, state requirements, implementation sequence, test requirements, verification commands, browser smoke checklist, artifact and secret checks, Git diff/status checks, no auto-commit boundary, and required completion report.

## Iterative Usage

When invoked after an implementation pass, compare new evidence against prior stated problems if the prior audit is supplied. Identify fixed issues, regressions, and remaining polish. Avoid repeating resolved findings, lower scope as the UI improves, and treat any previous audit file as history rather than unquestionable truth.
