<!-- BEGIN:product-docs-rules -->
# Product documentation
Read `docs/product-brief.md` and `docs/requirements.md` before starting any work. The requirements doc is the source of truth for requirement IDs (FR-*, NFR-*, TC-*, BC-*); reference them in commits and PRs.
<!-- END:product-docs-rules -->

<!-- BEGIN:current-state-rules -->
# Current state tracking
Maintain `docs/current-state.md` throughout your work. Before finishing any session, update it with:
- What was done (summary of changes, files touched)
- Timestamp of last action (ISO 8601, e.g. `2026-06-27T15:00:00Z`)
- Current state of the codebase (what works, what is incomplete, known issues)
- Suggested next steps

Create the file if it does not exist. Never delete it.
<!-- END:current-state-rules -->

<!-- BEGIN:openspec-rules -->
# All changes go through OpenSpec

This project uses the OpenSpec workflow. Every change — new feature, bugfix, or refactor — must follow the propose → apply → archive cycle using the available OpenSpec skills:

- **Explore** (`openspec-explore`): think through the problem before proposing
- **Propose** (`openspec-propose`): create a change with design, specs, and tasks
- **Apply** (`openspec-apply-change`): implement tasks from an approved proposal
- **Archive** (`openspec-archive-change`): close out a completed change

After every `/opsx:archive`, stage all changed files and create a git commit before starting the next capability.

Do not make ad-hoc edits outside of an active OpenSpec change.
<!-- END:openspec-rules -->

<!-- BEGIN:frontend-skill-ref -->
# Frontend work
Use the `frontend-design-skill` skill (`.agents/skills/frontend-design-skill/`) before writing any UI code, components, or styles.
<!-- END:frontend-skill-ref -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
