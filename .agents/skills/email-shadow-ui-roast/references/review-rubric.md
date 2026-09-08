# Email Shadow UI Roast Rubric

Use this reference after loading `SKILL.md` and before writing the review. It defines the audit checklist, evidence standard, priority model, and prompt-generation guardrails.

## Table of Contents

- Evidence standard
- Boundary checks
- Required source inspection
- Required states
- Responsive and accessibility checks
- Roast rules
- Priority model
- Recommendation fields
- Implementation prompt requirements
- Validation checklist for the reviewer

## Evidence Standard

Use evidence in this order:

1. User-supplied screenshots.
2. Current browser-rendered application when browser tools are available.
3. Locally rendered application.
4. Source-code inspection.
5. Documentation and previous screenshots.

Never claim a visual state was inspected unless it was rendered or supplied. If visual evidence is unavailable, label visual findings as provisional and list the missing screenshots or interactions that would improve confidence.

For source-only conclusions, use language such as "source suggests", "likely", or "provisional". Do not invent clipping, layout, animation, responsive, or browser defects from code alone.

## Boundary Checks

Inspect before reviewing:

- Root and project-level `AGENTS.md`.
- Current Git status.
- `package.json`.
- Relevant architecture documentation.
- Relevant Phase 3 and Phase 4 documentation.
- Existing UI source files.
- Existing design tokens and global styles.
- Existing tests relevant to frontend behavior.

Protect these areas unless a visible UX issue directly requires a narrow frontend exception:

- Emailnator integration.
- Provider contracts.
- Nitro routing.
- Public API contracts.
- Session encryption.
- Capability tokens.
- Visitor hashing.
- Upstash persistence.
- Abuse controls.
- Polling semantics.
- localStorage session schema.
- Message-safety guarantees.
- Deployment configuration.

## Required Source Inspection

Discover actual file names. Likely areas include:

- `src/routes/index.tsx`.
- `src/components/esp/AppShell.tsx`.
- Generation screen components.
- Transition or loading components.
- Mailbox screen components.
- `EmailAddressCard`.
- `RecentSessions`.
- `MessageList`.
- `MessagePreview`.
- `DetectedCodeCard`.
- `StatusBanner`.
- Hooks and controller state used by these screens.
- Global CSS.
- Tailwind design tokens.
- Frontend behavior tests.

Read only the files needed for the review. Do not edit application implementation during this skill.

## Required States

Generation screen:

- Clean first visit.
- Existing recent inboxes.
- Generate pending.
- Generation failure.
- Rate limited.
- Provider unavailable.
- Session limit reached.
- Generate Inbox CTA.
- Product explanation and trust signals.
- Initial, loading, failure, and retry states.

Transition screen:

- Normal motion.
- Reduced motion.
- Slow request.
- Fast request.
- Failure during transition.
- Preventing double generation.
- Whether animation feels purposeful rather than decorative or slow.
- Progress communication, timing, and anticipation.

Inbox screen:

- Empty inbox.
- Inbox with one message.
- Inbox with several messages.
- Selected and unselected messages.
- Message loading.
- Message-detail loading.
- Malformed or long text.
- Detected code.
- No detected code.
- Polling and refresh feedback.
- Expired session.
- Provider failure.
- Removal or forget confirmation.
- Generated address.
- Copy action.
- Recent inbox switching.
- Message list.
- Message preview.
- Responsive behavior.

Responsive targets:

- Desktop around 1440 x 900.
- Compact laptop around 1280 x 720.
- Mobile around 390 x 844.

Accessibility and interaction:

- Keyboard-only operation.
- Visible focus states.
- Meaningful button labels.
- Color contrast.
- Reduced motion.
- Text wrapping and overflow.
- Long generated addresses.
- Loading, error, retry, and success feedback.

## Roast Rules

Use humor to sharpen the feedback, not to insult the developer. Every roast must include:

- Concrete evidence.
- Why the issue hurts comprehension, confidence, or task completion.
- A practical correction.
- Component or region when known.
- Desired behavior.
- Acceptance criterion.

Avoid:

- "Make it modern."
- "Improve spacing."
- "Make it pop."
- "Clean up the UI."
- Broad redesign language without evidence.

Prefer:

- "In `MessagePreview`, long sender text should wrap or truncate within the panel at 390 px without pushing the action row offscreen."
- "During generation, the CTA should become disabled with an in-button progress label so repeated clicks are visibly unavailable."

## Priority Model

P0 - Blocks understanding, accessibility, or task completion.

P1 - Materially harms usability, hierarchy, trust, or responsiveness.

P2 - Noticeable polish or consistency issue.

P3 - Optional refinement with low product impact.

Complexity:

- Small: localized styling, copy, labels, focus states, or small state rendering.
- Medium: coordinated component changes, responsive layout adjustment, or focused test updates.
- Large: cross-screen layout change, new shared pattern, or behavior that touches controller state. Avoid Large items in the next batch unless the UX impact is high.

## Recommendation Fields

For each recommendation include:

- Priority.
- Screen.
- Affected component or file when known.
- Evidence.
- User impact.
- Proposed correction.
- Implementation complexity: Small, Medium, or Large.
- Acceptance criteria.

Limit the prioritized polish batch to at most 10 changes. Order by expected user value, not visual novelty.

## Implementation Prompt Requirements

The generated prompt must be complete enough for a new Codex implementation chat. Include:

- Role.
- Repository path as supplied or inferable from the current workspace; avoid embedding reusable machine paths in the skill itself.
- Branch guidance using the repository's conventions when known.
- Objective.
- Current verified product context.
- Exact approved improvements from the prioritized batch only.
- Likely files to inspect, while instructing Codex to discover actual names first.
- Behaviors to preserve.
- Explicit non-goals.
- Accessibility requirements.
- Responsive requirements.
- Animation and reduced-motion requirements.
- State requirements.
- Implementation sequence.
- Test requirements.
- Verification commands.
- Browser smoke checklist.
- Artifact and secret checks.
- Git diff and status checks.
- No auto-commit boundary.
- Required completion report.

Default verification expectations:

- `npm run lint`.
- `npm run typecheck`.
- `npm run test:phase3`.
- `npm run test:phase4` when deployment or UI boundaries are touched.
- `npm run build`.
- Focused frontend tests added or updated where behavior changes.
- Manual desktop and mobile browser sanity checks.

Do not require full live Emailnator smoke for a purely visual change unless generation, polling, detail, or removal behavior was altered. Do not require Playwright by default.

## Preserve These Decisions

Call out existing decisions that should not regress, such as:

- Existing product identity and tone.
- Working generation, polling, detail loading, removal, and session behavior.
- Useful state coverage already present.
- Security and privacy messaging that is accurate.
- Existing tests or docs that constrain behavior.
- Any verified responsive or accessible behavior that already works.

## Deferred Ideas

List valid ideas that should not be included in the next implementation pass, such as:

- A new design system.
- Broad information architecture changes.
- Decorative metrics.
- New backend/provider behavior.
- Live-provider smoke tests for visual-only work.
- Extra animations that do not improve progress communication.

## Validation Checklist for the Reviewer

Before finalizing the audit:

- Confirm all three product surfaces were covered.
- Confirm visual claims are backed by rendered/supplied evidence or clearly marked provisional.
- Confirm no protected backend, provider, API, Redis, security, or deployment scope was silently recommended.
- Confirm every roast has evidence, impact, correction, priority, and complexity.
- Confirm the prioritized polish batch has at most 10 rows.
- Confirm the implementation prompt includes only the prioritized batch.
- Confirm the implementation prompt tells Codex to inspect before editing and adapt file names.
- Confirm the implementation prompt preserves behavior and forbids auto-commit unless later requested.
- Confirm evidence needed for the next iteration is specific.
