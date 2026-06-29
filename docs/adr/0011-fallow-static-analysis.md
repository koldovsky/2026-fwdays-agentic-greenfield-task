# ADR-0011 — Fallow for static analysis (dead code, duplication, complexity)

*Status: Accepted (implementation deferred to M0) · Date: 2026-06-29 · Source: AGENTS.md "How we work" review axis, requirements §4, [fallow.tools](https://fallow.tools/docs/quickstart/)*

## Context
ESLint + Prettier ([ADR-0009](./0009-eslint-prettier-lint-format.md)) cover per-file correctness
and formatting, but not **whole-program** signals: unused files/exports/dependencies, circular
references, duplicated logic, and complexity hotspots. The folder-discipline structure (no
framework — see [ADR-0001](./0001-plain-typescript-no-nestjs.md)) makes dead-code and boundary drift
easy to accumulate and hard to spot in review. We want a **free** tool to catch this in CI, not
human vigilance.

The repo is greenfield — no `src/` yet — so there is nothing to analyze today. `typecheck` is
omitted from `ci.yml` for the same reason (tsc errors with no inputs). Scope of this ADR is the
**decision**; the CI wiring lands with M0 alongside the first `src/**/*.ts` and the `typecheck` step.

## Decision
- Adopt **Fallow** (`fallow.tools`) as the static-analysis layer for TS/JS. Its free, open-source
  layer does dead-code, duplication, and health/complexity analysis; zero-config first run.
- **Defer CI wiring to M0.** Add a Fallow step to `.github/workflows/ci.yml` in the same change
  that introduces `src/` and the `typecheck` step. Until then there is no source to scan.
- When wired: run via `npx fallow --ci` (JSON/SARIF output) or the `fallow-rs/fallow@v2` action with
  `format: sarif` so findings surface in the GitHub Security tab. Start **report-only**
  (non-blocking) and promote to a blocking gate once the baseline is clean — same graduation path
  ESLint took.
- **Free layer only.** The optional paid runtime-intelligence layer is out of scope; do not add a
  license step or trial activation to CI.

## Consequences
- **+** Catches unused exports/deps, circular refs, and duplication that per-file ESLint can't see —
  protects the folder-discipline boundaries.
- **+** Free + OSS; no new paid dependency, consistent with the RAM/cost constraints (analysis runs
  in CI off-box, never on the production host).
- **+** SARIF output integrates with GitHub's Security tab — no custom reporting.
- **−** Another CI step → marginally slower pipeline. Acceptable; gated to PRs + main like the rest.
- **−** Decision is recorded before use; if M0 reveals Fallow doesn't fit (false positives, the
  no-framework layout confuses its plugins), supersede this ADR rather than edit it.

## Alternatives considered
- **knip** — strong unused-files/exports/deps detector, popular. Overlaps Fallow's dead-code layer
  but lacks the duplication + complexity/health analyses in one tool. Viable fallback if Fallow
  underdelivers at M0.
- **ts-prune** — unused-exports only, and effectively unmaintained (author points users to knip).
  Too narrow.
- **depcheck / madge** — single-purpose (unused deps / circular deps). Would need stitching several
  tools where Fallow is one. Rejected for tool sprawl.
- **ESLint plugins only** (e.g. `eslint-plugin-import` no-unused-modules) — per-file model misses
  whole-program dead code and can't do duplication/complexity. Keep ESLint for what it's good at;
  add Fallow for the program-wide axis.
