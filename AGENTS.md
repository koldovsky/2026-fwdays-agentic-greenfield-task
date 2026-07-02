<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Product docs

Before planning or implementing features, read the docs in **`docs/`**:

- **[docs/requirements.md](docs/requirements.md)** — numbered requirements (`FR-*`, `NFR-*`, `TC-*`, `BC-*`); the traceable source of truth for what to build and how to verify it.
- **[docs/product-brief.md](docs/product-brief.md)** — business narrative, audience, and UX intent behind the requirements.
- **[docs/user-requirements.md](docs/user-requirements.md)** — verbatim user requirements and feature descriptions compiled from conversations.

When scope is unclear, resolve it against `requirements.md` first. Use the product brief for tone, priorities, and “why,” not as a substitute for requirement IDs.

# Session handoff

Maintain **[docs/current-state.md](docs/current-state.md)** as a living handoff log. Update it at the **end of every agent session** (or after any meaningful milestone) so the next run knows where things stand.

Each update must include:

- **Last updated** — ISO 8601 timestamp in Kyiv time zone (e.g. `2026-07-02T19:00:00+03:00`)
- **Last action** — one-line summary of what was just done
- **Status** — what works, what is in progress, what is blocked
- **Next steps** — concrete tasks for the next session
- **Notes** — decisions, open questions, or requirement IDs touched (optional but encouraged)

Do not duplicate full specs here; link to `requirements.md` / `product-brief.md` and record only session-specific deltas.

**CRITICAL RULE**: All update descriptions, statuses, next steps, and notes in [docs/current-state.md](file:///d:/home/Documents/Developer/2026-fwdays-agentic-greenfield-task/docs/current-state.md) MUST be written in Ukrainian.

