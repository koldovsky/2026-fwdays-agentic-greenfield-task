<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project documentation — read before working

Before starting any task, read the project docs to ground your work in the
agreed scope and constraints:

- **`docs/`** — the documentation hub; browse it for any context you need.
- **`docs/product-brief.md`** — the business narrative: what the product is, who
  it is for, the workflows, and the MVP-vs-future boundary.
- **`docs/requirements.md`** — the **single source of truth**. Every requirement
  has a stable ID (`FR-*`, `NFR-*`, `TC-*`, `BC-*`); reference these IDs in
  specs, tests, PRs, and commits to keep traceability intact.

When the docs and your assumptions disagree, the docs win. If a task conflicts
with a requirement, flag it rather than silently diverging.

# Current state log — `docs/current-state.md`

Maintain a running log at **`docs/current-state.md`** that records what the agent
did. Treat it as a handoff note for the next session.

- If the file does not exist, create it.
- **Update it at the end of every working session** (and after any significant
  action), before you finish.
- Each entry must capture at minimum:
  - **Timestamp** of the last action (ISO 8601, e.g. `2026-06-25T14:30Z`).
  - **What was done** — a short summary of the changes or work performed.
  - **Why / context** — the task or requirement IDs it relates to.
  - **Current state** — what is working, what is in progress, what is broken.
  - **Next steps** — what the next session should pick up.
- Keep the most recent entry at the top; do not delete history, append to it.

# Design system — Надворі (Weather Explorer)

This project has a design system. **Read `DESIGN.md` before doing any UI or
visual work.** It is the resolved `BC-BRAND-01` decision and explains how the
system is wired into the app.

Essentials:

- **Source of truth:** `docs/design-system/Weather Explorer Design System/`
  (full guidelines, components, reference UI kit, `nadvori-design` skill).
- **Wired into the app:** tokens in `app/design-system/`, imported by
  `app/globals.css`; fonts (Onest + JetBrains Mono) via `next/font` in
  `app/layout.tsx`; semantic tokens exposed as Tailwind v4 utilities.
- **Consume semantic aliases, never raw ramps** (`--brand`/`bg-brand`,
  `--text`, `--surface`, `--comfort-good-*`, not `--sky-500`).
- **Brand & voice:** calm, Ukrainian-first, **no exclamation marks**; lead with
  the comfort score, then the detail. WCAG AA, always-visible focus rings, and
  `prefers-reduced-motion` are hard constraints.
