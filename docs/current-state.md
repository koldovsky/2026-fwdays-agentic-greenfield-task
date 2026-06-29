# Current state — handoff

> Persistent handoff aid (not the source of truth — if it conflicts with
> code/specs/tests, verify and update it). Timezone: Europe/Kiev.

- **Last updated:** 2026-06-29, Europe/Kiev.
- **Phase:** Phase 4 autonomous build. **Slice 1 `add-app-shell` DONE** (archived). **Slice 2 `add-plants` GREEN** (Phase 4c implement): plants is the first DB slice — schema + first committed migration landed, full CRUD (add/list/detail/edit/delete-with-confirm) wired, all unit + integration tests pass, lint/build/openspec-validate green. Awaiting review-gate + archive. Remaining: growth → watering → charts.

### Deferred to Phase 6 (cross-cutting QA, tracked here so it isn't lost)
- Rendered a11y for every capability: `npm run check:a11y` (axe light+dark), WCAG AA contrast, keyboard-only, 360px responsive (NFR-A11Y-01/02/04, NFR-COMPAT-01) — run once over the whole app in Phase 6 with vision-verify + recordings.
- E2E enforcement of NFR-USA-01 (≤2 clicks) and NFR-COMPAT-02 (evergreen browsers) — Phase 5/6.
- Global `review-gate` re-run at Phase 7 (the per-slice security/spec "findings" that were clean-dimension reports or by-design no-auth should clear there).

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
- **Slice 2 `add-plants` (Phase 4, implemented)** — first DB slice. `plants`
  table (`db/schema/plants.ts`, re-exported from `db/schema/index.ts`); first
  committed migration `db/migrations/0000_flippant_galactus.sql`. `lib/plants/`
  (validation, date, queries, service, actions) on the shared `ActionResult`
  inline-error contract. Pages: list + empty state at `/`, add at `/plants/new`,
  detail at `/plants/[id]`, edit at `/plants/[id]/edit`, delete-with-confirm
  island. Species default = `Грошове дерево (Crassula ovata)`; acquired date is
  ISO `YYYY-MM-DD` stored / `DD.MM.YYYY` displayed, future-date rejected against
  today in Europe/Kiev. Slice-1 `ExampleForm` demo removed.

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
