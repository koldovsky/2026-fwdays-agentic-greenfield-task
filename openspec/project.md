# Project — Prokhidnyi (Прохідний)

Helps Ukrainian applicants estimate realistic admission chances to Ukrainian
higher-education programs from their NMT (НМТ) scores. Responsive web only (MVP).

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack) — read the bundled docs in
  `node_modules/next/dist/docs/` before using any API; this version has breaking
  changes vs. training data.
- **Runtime:** React 19, TypeScript 5.
- **Styling:** the dependency-free **Prokhidnyi design system** (`docs/design-system/`
  → vendored into `app/styles/`), vanilla CSS with `--pk-*` tokens and `.pk-*`
  classes. **No CSS framework** (TC-STACK-01). Fonts: Unbounded (display) + Manrope
  (body) via `next/font`.
- **Storage:** local-only for MVP (TC-STORAGE-01, BC-PRIVACY-01); no backend/accounts.

## Conventions

- **Language:** UI is Ukrainian (BC-LANG-01); numbers/dates via the `uk-UA`
  helpers in `app/lib/format.ts`.
- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `chore:` …).
- **Traceability:** every feature traces to a requirement ID (`FR-*`, `NFR-*`,
  `TC-*`, `BC-*`) in `docs/requirements.md`; specs cite those IDs.
- **Handoff:** update `docs/current-state.md` at the end of every work session.

## Source of truth

- Requirements: `docs/PRD.md`, `docs/requirements.md`.
- Capability decomposition: `docs/capabilities.md` + `docs/capabilities/`.
- Design system: `DESIGN.md` + `docs/design-system/`.
- Specs: `openspec/specs/`; changes: `openspec/changes/` (schema `spec-driven`).

## Domain notes

- Chance is presented as an estimate with an uncertainty band, never a guarantee
  (BC-HONESTY-01); traffic-light code: green = safe, amber = realistic, red = reach.
