# Agentic Engineering: Greenfield — Homework Assignment

Course **fwdays Academy · Agentic Engineering: Greenfield**.

This repository contains **TinyStart** — a calm, ADHD-informed focus app built spec-driven with AI agents. See [`docs/APP_SPEC.md`](docs/APP_SPEC.md) for the product specification and [`AGENTS.md`](AGENTS.md) for agent workflow rules.

## TinyStart — Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build
```

### Core routes

| Route | Purpose |
|-------|---------|
| `/` | Today Home — recommended task, quick add, micro recap |
| `/tasks/new` | Quick capture |
| `/tasks/[id]` | Task detail, breakdown, motivation |
| `/focus/[taskId]` | Focus session (presets, timer, pause/extend) |
| `/recap` | Daily recap (P1) |

### Specification hierarchy

1. [`docs/requirements.md`](docs/requirements.md) — requirement IDs (`FR-*`, `NFR-*`, `BC-*`)
2. [`docs/APP_SPEC.md`](docs/APP_SPEC.md) — screens, flows, data model
3. [`docs/design.md`](docs/design.md) — visual tokens and components
4. [`docs/openspec-capabilities.md`](docs/openspec-capabilities.md) — implementation slice order
5. [`docs/demo-capabilities.md`](docs/demo-capabilities.md) — Phase 3 demo video slices (Cursor workflow)

### Agentic engineering artifacts

- **Specification-Driven Development** — every slice maps to requirement IDs
- **Maker ≠ checker** — `docs/verification.md` + automated tests (`TC-STACK-05`)
- **Context engineering** — `AGENTS.md`, Vercel React best-practices skill
- **Verification gate** — lint, typecheck, test, build on every change

---

## Homework assignment (course template)

This assignment is not about the size of the product, but about the process: demonstrate that you can build from scratch by managing AI agents using **engineering practices** (context, loops, verification, maker ≠ checker), rather than simply “vibe coding.”

> Tech stack on **your choice**. This fork uses **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4** with device-local `localStorage` persistence.

What to Do

1. **Build your own small project** — anything that interests you.
   - The tech stack is up to you: Next.js, Python, Go, Rust, a mobile application, CLI, bot — your choice.
   - Keep the scope modest. A small project completed through the full engineering lifecycle is better than a large one that “kind of works.”
2. **Apply the Agentic Engineering practices** from the course — as many as are appropriate for your project:
   - context engineering (rules / `AGENTS.md`, static vs. dynamic context);
   - loop engineering instead of manual step-by-step prompting;
   - verification: tests / evals / checks instead of “it seems to work”;
   - maker ≠ checker (a separate agent or review pass);
   - Specification-Driven Development (SDD), where appropriate.
   - **Project Factory — optional, not required** (if you want the full factory, run `/project-factory:init` in your own environment).
3. **Record a 1–2 minute demo video**: briefly showcase your product and explain **how exactly you built it using an agentic approach**.

How to Submit

1. Create a **fork** of this repository (the CodeRabbit configuration and PR template come with it).
2. Enable **CodeRabbit** on your fork (free for public repositories) — it will review your PR as a mentor, in Ukrainian.
3. Add your project to the fork on a separate branch (using any tech stack). If you prefer to keep the code in a separate repository, include a link to it in the PR description.
4. Open a **Pull Request** and complete the template:
   - **Name** (your real name);
   - **link to the demo video** (1–2 minutes);
   - **description of the applied Agentic Engineering practices** — what exactly you built using agents, which tools / MCP you used, what decisions you made yourself, and what the agent handled.
5. Review the CodeRabbit feedback, iterate if necessary, and **submit the link to your PR** as your assignment.

## Evaluation Criteria

We evaluate **evidence of the process**, not the tech stack:

- ✅ your real name is provided;
- ✅ a demo video (1–2 minutes) is included;
- ✅ a **meaningful description** of the applied Agentic Engineering practices is provided;
- ✅ the project is completed end-to-end (not “generated and abandoned”).

**Bonus** — visible engineering artifacts: rules / `AGENTS.md`, specifications, tests / evals, verification evidence, separate review, demo recordings.

---

Questions — in the course channel. Good luck, and may the loops work for you 🟢
