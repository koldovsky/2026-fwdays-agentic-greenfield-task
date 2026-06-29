# ADR-0009 — ESLint + Prettier (lint/format tooling)

*Status: Accepted · Date: 2026-06-29 · Source: AGENTS.md "Code conventions" + backend-conventions skill, requirements §4*

## Context
The repo was greenfield (only `docs/`). Before any `src/` code lands we want a consistent,
machine-enforced baseline so the `backend-conventions` rules (guard clauses, explicit return types,
no floating promises) and review passes don't rely on human vigilance. Two orthogonal concerns:
**linting** (correctness/convention rules) and **formatting** (whitespace/quotes). Scope for this
change is **tooling only** — no runtime deps, no `src/` skeleton (those land with M0).

## Decision
- **ESLint v9 flat config** (`eslint.config.js`) with **typescript-eslint** `recommendedTypeChecked`
  + `stylisticTypeChecked`. Type-aware lint via `projectService` (auto-finds `tsconfig.json`), so
  rules like `no-floating-promises` work — important for the async bot.
- **Prettier owns formatting**, ESLint does not. `eslint-config-prettier` is applied **last** to
  disable all formatting-related lint rules (no `eslint-plugin-prettier` — keep them separate).
- **Prettier scope = code only.** `.prettierignore` excludes `**/*.md` (hand-authored PRD/ADRs/
  requirements with crafted tables) and `.coderabbit.yaml` (externally-consumed config we don't own
  the style of).
- **Strict `tsconfig.json`**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, NodeNext. Feeds type-aware lint and the future build.
- **Enforcement = husky pre-commit + lint-staged**: ESLint runs on staged `*.ts` before every
  commit; failures block locally. `format:check` also serves as a CI/pre-merge gate.
- A few convention rules promoted beyond defaults: `explicit-function-return-type` (warn),
  `no-floating-promises` (error), `consistent-type-imports` (warn), `eqeqeq`.

## Consequences
- **+** Convention drift caught at commit time, not review — frees the review pass for judgement.
- **+** No ESLint/Prettier rule conflicts (separation + `eslint-config-prettier`).
- **+** Type-aware lint catches real async bugs (unawaited promises) the bot is prone to.
- **−** Type-aware lint needs a TS program → slightly slower than syntactic-only lint. Acceptable.
- **−** husky pre-commit can be bypassed with `--no-verify`; it's a convenience gate, not a security
  control. CI `format:check`/`lint` is the real backstop (to land with M0 CI).
- **−** Markdown is not auto-formatted — intentional; docs stay as authored.

## Alternatives considered
- **Biome** (single fast lint+format tool) — rejected for now: typescript-eslint's type-aware rules
  are more mature, and the `backend-conventions` rules map directly to ESLint. Revisit if lint
  speed becomes a pain.
- **eslint-plugin-prettier** (run Prettier as an ESLint rule) — rejected: slower, noisier editor
  feedback, and the official guidance is to keep them separate.
- **Legacy `.eslintrc`** — rejected: deprecated path; flat config is the v9 default.
