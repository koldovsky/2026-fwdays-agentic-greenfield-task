# Focus Blocks

Plan your day in plain text — and instantly see the timeline, overlaps, and focus time.

You write lines like `9:00-10:30 deep work`, and the app parses them into time
blocks, validates them, finds conflicts and gaps, and draws a scaled vertical timeline.

## Quick start
```bash
npm install
npm run dev      # http://localhost:3000
```

## Commands
| Command           | What it does                                 |
|-------------------|----------------------------------------------|
| `npm run dev`     | Dev server                                   |
| `npm run build`   | Production build (checks it all compiles)     |
| `npm run test`    | Unit tests + eval set                        |
| `npm run lint`    | Type check (tsc)                             |

## Structure
```
docs/SPEC.md        — specification (source of truth, SDD)
docs/REVIEW.md      — maker != checker review pass
AGENTS.md           — rules for the AI agent (static context)
src/lib/            — pure logic (parser, time) — covered by tests
src/app/            — Next.js UI (display only)
tests/              — Vitest: unit tests (R1-R5) + eval set
```

## Agentic Engineering practices
Details are in the PR description. In short:
- **SDD:** `docs/SPEC.md` with rules R1-R5 and Definition of Done was written first, then the code.
- **Context engineering:** `AGENTS.md` as static context; the task and test failures are dynamic context.
- **Loop engineering:** the "code -> `npm run test` -> fix" cycle instead of manual step-by-step prompting.
- **Verification:** unit tests for each rule + a separate edge-case eval set.
- **Maker != checker:** a separate review pass found a bug in overlap detection
  (only adjacent blocks were compared) — documented in `docs/REVIEW.md`.

## Boundaries (deliberately out of scope)
Blocks crossing midnight, server persistence, authentication, time zones. See `docs/SPEC.md` section 7.
