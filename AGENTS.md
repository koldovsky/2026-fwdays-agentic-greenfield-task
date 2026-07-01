<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vouch

Vouch is a Ukrainian-first **Honest Resume Tailor** (Next.js app).

## Docs

Read the relevant doc in `docs/` before working in its area:

- [`docs/cv-agent-requirements.md`](docs/cv-agent-requirements.md) — PRD, the single source of truth. Numbered requirements (`FR-*` / `NFR-*` / `TC-*` / `BC-*`); cite IDs in specs, PRs, tests.
- [`docs/cv-agent-product-brief.md`](docs/cv-agent-product-brief.md) — business narrative behind the PRD (who/why, end-to-end usage, MVP boundary).
- [`docs/system-design.md`](docs/system-design.md) — architecture: Feature-Sliced Design frontend + async two-pass tailoring pipeline.
- [`docs/DESIGN.md`](docs/DESIGN.md) — design system: brand rules + how tokens/fonts are wired into the app.
- [`docs/current-state.md`](docs/current-state.md) — live work log / handoff (see rule below).

## Current-state log (required)

`docs/current-state.md` is the running handoff between agent sessions. **Read it at the start of every session** and **update it before you finish** any unit of work. Keep it short and current — overwrite stale content, do not append endlessly.

It must always answer:
- **Last action** — what was just done, with an ISO-8601 timestamp (`YYYY-MM-DD`, add time if known).
- **Working on** — the requirement IDs (`FR-*` / `NFR-*` / `TC-*` / `BC-*`) currently in progress.
- **Next steps** — the concrete next actions for whoever picks up.
- **Blockers / open questions** — anything unresolved.

## Skills (Agentic Engineering)

Project skills live in `.claude/skills/` (Claude Code) and `.cline/skills/` + `.clinerules/workflows/` (Cline). Reach for them by default:

- **agent-verify** — verify a change (build/lint/test → FR/NFR evidence). Run before any handoff or PR. *(verification)*
- **checker-review** — independent review of a diff vs PRD + DESIGN + FSD rules. Second pass, not the maker. *(maker ≠ checker)*
- **fsd-scaffold** — scaffold an FSD slice at the right layer with the import-rule guardrails. *(architecture)*
- **honesty-eval** — evals for the two-pass grounding + overclaim detection. *(evals)*
- **sync-current-state** — read/update `docs/current-state.md` handoff. *(loop continuity)*
- **openspec-\*** — spec-driven change workflow (propose/apply/archive/sync/explore). *(SDD)*

## Spec-Driven Development (SDD)

This project is spec-driven (OpenSpec, `schema: spec-driven`). **Spec before code** for any new or changed capability.

- **Baseline specs** live in `openspec/specs/<capability>/spec.md` — the current committed truth (`Purpose` + `Requirements` with `WHEN/THEN` scenarios). Today: `app-shell`, `design-system`, `checklist`, `bullets`. Every requirement cites its PRD ID.
- **Changes** are proposed as deltas under `openspec/changes/` via the openspec skills: `openspec-propose` → `openspec-apply` → `openspec-archive` (archive folds deltas into the baseline specs).
- The PRD (`docs/cv-agent-requirements.md`) stays the source of truth for *what* and *why*; specs make behavior testable (`WHEN/THEN`) and traceable. Keep them in sync.
- Validate specs/changes: `openspec validate --specs` (or `openspec validate <change>`). Project context + artifact rules are in `openspec/config.yaml`.

Workflow: propose a change → generate specs/design/tasks → implement (`fsd-scaffold`) → verify (`agent-verify`) → review (`checker-review`) → archive.

## Design

Read [`DESIGN.md`](docs/DESIGN.md) before building or restyling any UI — it covers the brand rules and how the design system is wired into the app. The full system (tokens, components, UI kit, guidelines) lives in `docs/vouch-design-system/` and as the `/vouch-design` skill.

Quick rules: design tokens are Tailwind v4 `@theme` vars in `src/app/globals.css` — style with utilities (`bg-ink`, `text-brand`, `font-display`, `rounded-xl`, `shadow-card`). Fonts load via `next/font` in `src/app/layout.tsx`. Never add new brand hues, emoji, exclamation points, or icon libraries.
