# Weather Explorer — Agent Rules

> `CLAUDE.md` → `@AGENTS.md`. Canonical entry for every AI tool in this repo.

## This is NOT the Next.js you know

Next.js **16.2** / React **19** may differ from training data. Read the relevant
guide in `node_modules/next/dist/docs/` before writing app code. Heed deprecation
notices.

Requirements: `docs/requirements.md` (FR/NFR/TC/BC). Narrative: `docs/product-brief.md`.
Visual identity: `DESIGN.md`.

## Project Factory

This repo uses **Project Factory** — spec-driven delivery with deterministic gates.

- **Cursor:** `.cursor/rules/project-factory.mdc` + `.agents/skills/project-factory/`
- **OpenSpec:** `/opsx:propose`, `/opsx:apply` (see `.cursor/commands/`)
- **Gates:** `checklists/quality-gates.md` (G0–G8)
- **Loop:** `scripts/check-*`, `.githooks/`, CI — pure Node + git, tool-agnostic
- **Orchestration:** run review/eval/spec passes with **fresh context** (maker ≠ checker)

Before substantive work, read when present:

1. `docs/memory/` — Memory Bank (operational summaries; see `docs/memory/README.md`)
2. `docs/current-state.md` — handoff (phase, next step)
3. `docs/mvp-capability-plan.md` — slice order and FR ownership
4. `openspec/specs/` — capability contracts
5. `docs/adr/` — accepted decisions

Update `docs/memory/activeContext.md` and `docs/memory/progress.md` when focus or
status changes. Update `docs/current-state.md` after each archived slice or gate passage.
Homework submission checklist: `docs/homework-submission.md`.

At the end of every substantive response, propose the next recommended step so
the user does not need to ask "what next?". Keep it short, grounded in
`docs/current-state.md` and `docs/mvp-capability-plan.md`, and name the next
slice/gate when one is obvious.

## Stack & module conventions

- **App:** Next.js 16 App Router, TypeScript strict, Tailwind 4, shadcn/ui base-nova
- **`lib/`** is framework-free (`TC-PURE-01`): no `next/*`, no `react`, no DOM — 100% unit-testable
- **`lib/<domain>/`:** pure helpers + colocated `*.test.ts` with `// @trace FR-x`
- **`lib/i18n/uk.ts`** (+ `en.ts`): all UI strings; Ukrainian-first, calm tone, no exclamation marks
- **Data:** Open-Meteo (forecast + geocoding), OSM tiles via Leaflet — keyless, no accounts, no cookies
- **Pages:** thin server components; client only when needed (map, animations, search)

## Correctness rules

- No analytics, trackers, or application-set cookies (`BC-PRIVACY-*`)
- Geolocation only on explicit user action — never on page load
- External API failures: calm inline degradation, never a generic error page or silent blank
- Console silent on a healthy session (`NFR-OBS-01`)
- Comfort rationale must not contradict weather data (e.g. never «приємно» in rain)

## Test-first (per slice)

Write tests from the OpenSpec scenario **first**, confirm they **fail** (red), then
implement to green. Never weaken a test to pass it.

## Validation cadence

```bash
npm run lint
npm run test:run
npm run build
npx @fission-ai/openspec@latest validate --all --strict
npm run check:trace
npm run check:trajectory   # after review evidence exists
npm run check:eval         # once eval cases exist
```

Commits touching `app/`, `lib/`, `db/`, or `src/` must include a trace trailer:

```
Refs: FR-COMFORT-01
Slice: add-comfort-score
```

Git hooks (`.githooks/`) enforce this on every commit.

## Evals

- **Output evals** (`evals/cases/*.eval.ts`): grade quality unit tests can't — rationale tone, error clarity
- **Trajectory evals:** `check-trajectory.mjs` + fresh judge — test-first, scope, review evidence
- Recordings illustrate; evals decide pass/fail

See `evals/README.md`.

## Memory Bank

Operational summaries: `docs/memory/*` (enforced by `.cursor/rules/memory-bank.mdc`).  
Project Factory handoff: `docs/current-state.md`.  
Deep dives: `openspec/specs/`, `docs/requirements.md`, `docs/qa/`.

Keep memory files short; link out for proofs and long narratives.

## Skills (dynamic context)

- `vercel-react-best-practices` — Next.js / React patterns
- `project-factory` — full delivery orchestrator

Load on demand; do not duplicate their content here.
