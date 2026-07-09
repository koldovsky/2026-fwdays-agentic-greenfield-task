# AGENTS.md

Rules for the AI agent working in this repository. Read before making changes.

## What this is
Focus Blocks — a Next.js utility that parses a plain-text day plan into time blocks.
Full spec: `docs/SPEC.md` — it is the source of truth. If code and SPEC diverge,
update the SPEC first, then the code.

## Architecture (keep the boundary)
- `src/lib/` — PURE logic (parser, validator, metrics). No React, no DOM, no I/O.
  Everything is unit-tested.
- `src/app/` — Next.js App Router, UI only. Do not duplicate logic — import from `lib`.
- `tests/` — Vitest. Every rule from the SPEC (R1-R5) has a test.

## Commands
- `npm run test`        — unit tests + evals (must be green before committing)
- `npm run test:watch`  — dev mode
- `npm run build`       — Next.js production build (must pass)
- `npm run lint`        — TypeScript type check

## Working loop (loop, not step-by-step prompting)
1. Change code.
2. Run `npm run test`.
3. If red — read the error, fix, repeat STEP 2.
4. Do not move on until tests are green.
5. Before finishing a feature — `npm run build`.

## Conventions
- TypeScript strict. No `any` in `lib`.
- Internal time = minutes from 00:00 (a number). Format to HH:MM only at the UI edge.
- Function names and error messages stay consistent with SPEC section 5.

## Boundaries (do not do)
- Do not add dependencies without need.
- Do not go beyond SPEC section 7 (no DB, no auth, no crossing midnight).
- Do not change the function contracts in SPEC section 5 without updating the SPEC.
