<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project documentation

Before planning or implementing work, read the docs in `docs/` and the design guide at the repo root:

- **[docs/requirements.md](docs/requirements.md)** — single source of truth for functional and non-functional requirements (stable IDs such as `FR-*`, `NFR-*`, `TC-*`, `BC-*`). Reference these IDs in specs, tests, PRs, and commit messages when applicable.
- **[docs/product-brief.md](docs/product-brief.md)** — business narrative, user context, MVP scope, and tone. Use it to understand *why* the product exists and how it should feel; defer to `requirements.md` when they differ on specifics.
- **[DESIGN.md](DESIGN.md)** — minimal design system for the lab MVP (layout, color tokens, typography, spacing, shadcn/ui usage, map markers, Ukrainian copy, accessibility). Follow it when building or styling UI; defer to `requirements.md` for functional behavior.

Do not contradict accepted requirements without explicitly noting the conflict and asking how to proceed.

## Session continuity (`docs/current-state.md`)

Maintain **[docs/current-state.md](docs/current-state.md)** so the next agent session can resume without re-discovering context.

**When to update:** at the end of every meaningful work session — after implementing a feature, fixing a bug, making architectural decisions, or stopping mid-task with unfinished work.

**What to record:**

- **Last updated** — local time in Europe/Kyiv, format `HH:MM day month` (e.g. `18:17 1 July`).
- **Last action** — one-line summary of the most recent change or decision.
- **Current focus** — what was in progress or what should happen next.
- **Completed this session** — bullet list of concrete outcomes (files touched, requirements addressed by ID when relevant).
- **Open items / blockers** — unresolved questions, failing tests, or dependencies on the user.
- **Notes for next agent** — anything non-obvious (branch name, env setup, partial migrations, etc.).

Replace outdated sections rather than appending indefinitely; keep the file scannable and under ~50 lines unless the project phase genuinely needs more.
