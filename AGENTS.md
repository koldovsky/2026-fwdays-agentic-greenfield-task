# AGENTS.md — tf-guard

Single source of truth for any agent (or human) working in this repo. Versioned like
code; reviewed in PRs. The agent forgets between sessions — this file does not.

## What this is

`tf-guard` is a small, **keyless, offline** CLI that reads a `terraform plan -json`
file and produces a **risk-ranked report** of policy violations (missing required
tags, dangerous deletes/replaces of stateful resources). It is the homework artifact
for *fwdays — Agentic Engineering: Greenfield*.

## Stack (Technical Constraints)

- TypeScript (strict, `NodeNext`), Node ≥ 20, ESM only.
- Runtime: `tsx` for dev, `tsc` for build. Tests: **`node:test`** (built-in, no test
  framework). Lint: `eslint` (flat).
- Boundary validation: `zod` is the only runtime dependency. Keep the dependency tree
  tiny so `npm ci` is fast and lockfiles stay cross-platform clean.

## Architecture rules

- **Pure core in `src/lib/`** — no I/O, no `process`, no `fs`. Pure functions only,
  so unit tests are deterministic gates. The CLI (`src/cli.ts`) is the only I/O shell.
- **Vertical slice per capability.** Current capability: *risk-scoring* (`FR-SCORE`).
- **Explicit contracts at boundaries**: parse untrusted plan JSON through `zod`
  (`src/lib/parse.ts`); everything downstream is typed and trusted.
- `noUncheckedIndexedAccess` is on — handle `undefined` from index access.

## Hard rules (DO / DO NOT)

- **NEVER** commit secrets, tokens, real cloud credentials, or real `terraform`
  state/plan files. Fixtures under `tests/fixtures/` must be synthetic. `.env` is
  git-ignored; only `.env.example` is committed.
- **NEVER** add network calls or paid-API dependencies — the tool must run in CI
  with zero credentials.
- **DO NOT** put logic in `src/cli.ts` beyond argument parsing + printing.
- Add a rule to this file every time an agent does something it should not have.

## Verification (the quality multiplier)

- `npm run verify` = `lint → typecheck → test → eval`. Must be green before any commit.
- **Tests** (`tests/`) are deterministic: one input → one expected output.
- **Evals** (`evals/`) score the human-readable summary against a rubric on a dataset
  with a passing threshold + a baseline **ratchet** (the bar never drops).
- Separate **reviewer** pass (maker ≠ checker) before merge — see `.agents/reviewer.md`.

## Where intent lives

- `docs/requirements.md` — numbered FR/NFR/TC/BC (the contract).
- `docs/product-brief.md` — the narrative behind the requirements.
- `DESIGN.md` + `docs/adr/` — *why* decisions were made (intent debt mitigation).
- `openspec/changes/` — spec-driven change proposals.
