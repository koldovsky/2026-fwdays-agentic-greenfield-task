# Current State — Sport & Nutrition Coach

*Last updated: 2026-06-29 · by: Ihor + agent · Update rule: see bottom*

Living snapshot of where the **whole project** is right now. Read at session start; update at
session end or after meaningful progress. This is the cross-cutting status — per-change specs and
tasks live in `openspec/`; product/architecture intent lives in `docs/`. The dependency-ordered
**change backlog** (what the impl loop runs next) lives in [openspec/backlog.md](../openspec/backlog.md).

## TL;DR
Greenfield. Design docs done (PRD, requirements, review templates, AGENTS.md). **No code
scaffolded yet.** Next milestone: **M0 — Pipe** (repo skeleton → deployed message round-trip).

## Milestone status *(milestones defined in [prd.md](./prd.md) §9)*
| Milestone | State |
|---|---|
| M0 — Pipe (skeleton, webhook, Dockerfile, CI→GHCR, Coolify) | 🟡 in progress (lint/format tooling landed; runtime skeleton next) |
| M1 — Data (Postgres capped+tuned, Prisma schema+migrations) | ⬜ not started |
| M2 — Onboarding (`/start` + targets) | ⬜ not started |
| M3 — Core logging (text + Food DB) | ⬜ not started |
| M4 — Vision (photo plate) | ⬜ not started |
| M5 — Body (metrics + progress notes) | ⬜ not started |
| M6 — Reviews (daily + cron + rollups) | ⬜ not started |
| M7 — Notion mirror | ⬜ not started |
| M8 — Hardening | ⬜ not started |

Legend: ⬜ not started · 🟡 in progress · ✅ done

## Done
- Product/architecture docs: `docs/prd.md`, `docs/requirements.md`, `docs/review-templates.md`.
- Decision records: `docs/adr/` (0001–0011).
- Agent docs: `AGENTS.md` (canonical) + `CLAUDE.md` (pointer).
- CodeRabbit config + PR template (from homework starter).
- OpenSpec config: `openspec/config.yaml` context + per-artifact rules (incl. maker≠reviewer task).
- Lint/format tooling: ESLint flat (type-aware) + Prettier + husky pre-commit. ADR-0009.
- Test runner: Vitest (ADR-0010). CI quality gate (`.github/workflows/ci.yml`) + husky pre-push
  (docs-sync + tests). Docs-drift guard: `scripts/check-docs-sync.mjs`.

## In progress
- M0 runtime skeleton — `src/` tree, grammY wiring, Dockerfile, CI→GHCR (not started yet).

## Next up
1. M0: scaffold plain-TS + grammY repo (`src/` per requirements §4) on the existing tooling base,
   multi-stage Dockerfile, runtime deps, zod env validation in `config/`. Also add the deferred
   `typecheck` + Fallow static-analysis steps to `ci.yml` (ADR-0011) — both need `src/` to exist.
2. Wire GitHub Actions → GHCR; create Coolify `nutrition-bot` project; prove a deployed round-trip.

## Key decisions (locked)
- Plain TS, no NestJS (RAM); no agent framework (cost); raw Anthropic API + structured output.
- Postgres = source of truth; Notion = async best-effort mirror.
- Images never persisted. Totals always from SQL SUM. (Full rules: `AGENTS.md`.)

## Open questions / blockers
Tracked in [prd.md](./prd.md) §11 (Food DB sharing, onboarding length, template fidelity, registry).
No hard blockers — ready to scaffold.

---
### Update rule (keep this file honest)
Update when project state changes: milestone flips, a feature lands, a decision is made, or a
blocker appears. Touch only the affected lines + bump the date. If a planned command/struct in
`AGENTS.md` becomes real, unmark it there too. Stale state is worse than no state — a 30-second
update beats a misleading snapshot.
