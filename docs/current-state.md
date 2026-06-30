# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30` (Europe/Kyiv)

## Phase

**Stage 3 — Architecture: complete.** Next: Stage 4 (author the loop) → per-slice build.

## Last action

Authored `docs/mvp-capability-plan.md`: 8-slice table, acyclic dependency graph (mermaid + textual), critical path (`app-shell → i18n → currency-list → rate-history → trend-hint`), recommended build order, per-slice DoD + risks, and an FR-coverage table proving no gaps/duplicates. (Prior: `docs/requirements.md` — **25 MVP FRs** + 1 Future + NFR/TC/BC, stable ids; `docs/context-architecture.md`; 8 baseline specs validating `--all --strict` green; `config.yaml` context.)

## Status

- **Working:** app builds + lints green; design system wired. 8 specs validate strict. Still uncommitted.
- **Done (Stage 1):** product brief + ADR-0001/0002/0003; `AGENTS.md` handoff + product-docs rules; docs self-contained; checker = own two agents.
- **Done (Stage 2a):** design system wired (`docs/design-system/`, `app/styles/tokens/`, `components/ds/`, fonts, `DESIGN.md`, both skills); vendored DS excluded from lint.
- **Done (Stage 2):**
  - `docs/requirements.md` — FR/NFR/TC/BC, Phase, stable ids (25 MVP FRs + 1 Future).
  - `docs/context-architecture.md` — static-vs-dynamic context budget.
  - `openspec/specs/{app-shell,i18n,currency-list,currency-picker,converter,rate-history,trend-hint,footer-sayings}/spec.md` — validate `--all --strict` green.
  - `openspec/config.yaml` — project context added.
- **Done (Stage 3):** `docs/mvp-capability-plan.md` — slice table, acyclic dependency graph, critical path, build order, per-slice DoD + risks, FR-coverage (25/25, no gaps/dupes). **Checkpoint 2.**
- **In progress:** —
- **Blocked:** —

## Next steps

1. **Stage 4 (author the loop):** finalize `AGENTS.md` rules; `.claude/agents/{kurs-maker,kurs-reviewer,kurs-eval-judge}.md`; `.claude/commands/{propose-slice,review-slice}.md`; `CHECKLIST.md`; `.githooks/{pre-commit,commit-msg}`; `ci.yml`; `scripts/check-traceability.mjs`; verify lint/build green + hooks fire.
2. Then the per-slice loop, build order: `app-shell` → `i18n` → `currency-list` → `converter` → `rate-history` → `trend-hint` → `currency-picker` → *(optional)* `footer-sayings`.
3. Before `rate-history`: verify the NBU history endpoint live (ADR-0002).

## Notes / decisions

- Brand name **«Гривня»** confirmed (`package.json` name `hryvnia`); skill prefix `hryvnia-` (design) / `kurs-` (agents + currency skill).
- Design skills: `hryvnia-design` (generation, in the ZIP) + `hryvnia-frontend-design` (application, authored).
- Lucide loads via UMD CDN (flagged substitution); Recharts is deferred (UMD global, wired at the chart slice).
- The design ZIP remains at `docs/Hryvnia exchange rate app design.zip` (source archive).
- Capability slices (order): `app-shell` → `i18n` → `currency-list` → `converter` → `rate-history-chart` → `trend-hint` → `footer-sayings` (optional).
- Requirement-ID prefixes reserved: `FR-SHELL/RATES/PICK/CONVERT/HISTORY/TREND/SAYINGS-*`, `NFR-*`, `TC-*`, `BC-*`.
- Engineering docs in **English**; product copy in **Ukrainian**.
- Scaffold + Stage-1 docs are still **uncommitted** — commit when the user approves scope (Checkpoint 1).
- `AGENTS.md` is currently only the Next.js preamble; the full authored version comes at Stage 4.
