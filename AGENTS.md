<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-docs -->


# Project documentation

Read the docs in `docs/` before planning or implementing features:

- [docs/requirements.md](docs/requirements.md) — single source of truth for product requirements
  (stable IDs: FR-xxx, NFR-xxx, UI-xxx, etc.). Trace work to these IDs in specs, tests, and PRs.
- [docs/PRD.md](docs/PRD.md) — engineering specification: architecture, user flows, feature
  behavior, and technical decisions. Expands on requirements.md.

When scope is unclear, check requirements first, then PRD for how to build it.

## Session state (`docs/current-state.md`)

Maintain [docs/current-state.md](docs/current-state.md) across sessions. Update it at the end of
every meaningful work block (feature work, bug fix, refactor, or doc change):

- **Last updated** — ISO 8601 timestamp (UTC) of the last agent action
- **Last session summary** — what was done, in 2–5 sentences
- **Current focus** — active task or next step
- **Completed recently** — bullet list of finished items (keep last ~5)
- **Blockers / open questions** — anything needing human input
- **Files touched** — key paths changed in the last session

Read `docs/current-state.md` at the start of a session to pick up where the last agent left off.
Do not delete historical context abruptly — roll `Completed recently` forward and keep the file
concise (one screen).
<!-- END:project-docs -->

<!-- BEGIN:design-system -->


# Design system

Notely has a design system integrated at `.agents/skills/notely-design/` — read
[DESIGN.md](DESIGN.md) before building any UI. In short:

- Import components from `@notely-design/components` (barrel export), not from component
  internals.
- Use the CSS tokens in `.agents/skills/notely-design/tokens/` (via `var(--color-primary)`,
  `--radius-md`, `--space-16`, etc., or the `t-h1`/`t-body`/... type classes) for anything
  brand-specific; use Tailwind only for layout.
- Follow the copy rules in `.agents/skills/notely-design/readme.md`: sentence case, warm and
  brief, no exclamation marks, no emoji in product chrome.
- Components using hooks or DOM event handlers need `"use client"` — check DESIGN.md's
  "Local adaptations" section for which ones already have it.
- Don't edit files under `.agents/skills/notely-design/` casually — it's the single source
  shared by the agent skill and the app. If a change is genuinely needed, record it in
  DESIGN.md's "Local adaptations" list.
<!-- END:design-system -->
