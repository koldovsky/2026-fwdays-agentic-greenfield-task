# Current state — handoff

> Persistent handoff aid (not the source of truth — if it conflicts with
> code/specs/tests, verify and update it). Timezone: Europe/Kiev.

- **Last updated:** 2026-06-29, Europe/Kiev.
- **Phase:** Phases 0–3 done (scaffold, requirements, baseline specs, capability plan all signed off). **Now: Phase 4 autonomous build**, slice 1 of 5 (`add-app-shell`). Next slices: plants → growth → watering → charts.

## What this is

A short, single-user web app to track succulent (money tree) growth and
watering, with a watering chart and a growth chart. Scope is deliberately small
(`docs/requirements.md`, `docs/product-brief.md`).

## Done so far

- **G0** — Project Factory loop installed (`/project-factory:init`): agents,
  workflows, `scripts/check-*`, git hooks (`core.hooksPath=.githooks`), CI,
  OpenSpec fallback layout, filled `AGENTS.md`/`CLAUDE.md`/context-architecture +
  ADR-0002.
- **Phase 0 scaffold** — Next.js 16 (App Router, TS) + Tailwind 4 + ESLint 9;
  SQLite + Drizzle (`db/client.ts`, `drizzle.config.ts`, `db/migrate.ts`,
  `db/seed.ts`, empty `db/schema/index.ts`); Recharts; Vitest (`vitest.config.ts`)
  + Playwright (`playwright.config.ts`); `.env.example`. Stack recorded in
  **ADR-0001**. `npm run build`, `tsc --noEmit`, `eslint .` all green.
- **G1 / Phase 1** — `docs/requirements.md` (25 MVP FRs + NFR/TC/BC, numbered),
  `docs/product-brief.md`. Checkpoint 1 signed off: all defaults + UI language
  **Ukrainian**, local SQLite run, no cloud deploy in MVP.

## Next step

Phase 2 — run the `spec-pipeline` workflow to author baseline OpenSpec specs
(one per capability; every MVP FR owned exactly once), then `openspec validate`.
Then Phase 3 capability plan → **Checkpoint 2** (plan sign-off) before the
autonomous build.

## Notes / gotchas

- UI copy is Ukrainian; code, specs, and trace ids stay English.
- `.claude/settings.json` (PostToolUse ESLint hook) was deferred at init — the
  self-modification guard blocked writing an agent hook. Not yet installed.
- npm v11 gates native install scripts; `better-sqlite3` prebuilt binary loaded
  fine. If it ever fails, `npm rebuild better-sqlite3`.
