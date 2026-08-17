<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project documentation

Before planning or implementing product work, read and follow the docs in `docs/` and the design source of truth:

- `docs/product-brief.md` — problem, audience, solution, and value
- `docs/requirements.md` — functional and non-functional requirements
- `DESIGN.md` — UX, visual, and interaction design

Prefer these files over assumptions. If they conflict with code or each other, call out the conflict and ask before changing behavior.

# Session continuity (`docs/current-state.md`)

Maintain `docs/current-state.md` as the handoff log between agent sessions.

- **Read it first** at the start of a session (after the docs above when doing product work).
- **Update it before ending** meaningful work — do not leave the next agent without context.
- Keep it factual and concise. Overwrite stale “current” sections; append only when a short history helps.

Include at least:

| Field | Purpose |
|-------|---------|
| Last updated (ISO 8601 timestamp + timezone) | When the last agent action finished |
| Last action | What was done in this session |
| Current focus | What is in progress or next |
| Key decisions | Choices that affect future work |
| Blockers / open questions | Anything unresolved |
| Relevant paths | Files or areas touched |

Create the file if it is missing.
