# AGENTS.md — Ticket2MD

Single source of agent instructions for this repo. `CLAUDE.md` imports this file; do not duplicate content between them.

## Project

Ticket2MD — a Chrome extension (Manifest V3) that exports the currently open Jira ticket into a Markdown folder (`Downloads/<TICKET-ID>/` with a `.md` file and a `media/` subfolder). Everything runs locally in the browser.

Extension code lives in `app/` (not yet scaffolded). This repo is a fwdays Agentic Engineering homework: process artifacts (docs, tests, traceability) matter as much as the product.

## Source of truth

- `docs/product-brief.md` — what and why.
- `docs/requirements.md` — FR-xx / NFR-xx requirements with `accepted` / `proposed` statuses.
- `docs/DESIGN.md` — visual identity, popup states, color tokens (Pico CSS).
- `docs/STATE.md` — cross-session progress: what is done, what remains, next step. Read it when resuming work; update it after completing a chunk of work (evidence-based: only tick items the repo can prove). The `/current-state` skill automates this: it verifies the file against git history and repo reality, reports done/remaining/next, and refreshes the file — prefer invoking it over editing STATE.md ad hoc.

Rules for working with them:

- Reference requirement IDs (FR-xx, NFR-xx) in specs, tests, and PR descriptions.
- Never silently contradict an `accepted` requirement. If implementation reveals a conflict, stop and surface it.
- `proposed` items may be refined, but update the doc in the same change.

## OpenSpec

This repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`openspec/`) for spec-driven change proposals — `/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore`, `/opsx:sync` (Claude Code slash commands under `.claude/commands/opsx/`). `docs/requirements.md` remains the authoritative FR-xx/NFR-xx source; OpenSpec changes must not contradict an `accepted` requirement there (see rule above) — `openspec/config.yaml` restates that constraint as project context for AI-generated artifacts.

## Architecture invariants

- **Framework-free `lib/`**: the Jira DOM parser, Markdown serializer, and anonymizer are pure TypeScript with no Chrome or framework APIs — 100% unit-testable (NFR-07). Chrome APIs (`chrome.downloads`, `chrome.scripting`) are used only in the extension shell.
- **Popup is vanilla TS + Pico CSS.** No React/Preact/etc. (NFR-05). Styling via Pico CSS variables only; no hardcoded colors.
- **Data comes from the DOM** of the open tab, never from tracker APIs or tokens (FR-02).
- **Build**: Vite + CRXJS, TypeScript strict.

## Privacy invariants (non-negotiable)

- No analytics, telemetry, fingerprinting, cookies, or third-party requests (NFR-01). The only network activity allowed is fetching attachments from hosts the ticket page itself uses.
- Anonymization is ON by default: names in text, comments, and media file names become `User1`, `User2`, … with a consistent mapping per export (FR-19–FR-21).
- Minimal permissions: `activeTab`, `scripting`, `downloads` (NFR-04). Adding any permission requires updating `docs/requirements.md` first.

## Error-handling contract

A failed media download is reported in the popup error details but never aborts the Markdown conversion or the remaining downloads (FR-12). Partial success is a valid, visible outcome — never fail silently and never fail totally because of one attachment.

## Conventions

- UI strings: English only (NFR-03).
- File naming in exports: keep Cyrillic in the ticket title, strip only filesystem-forbidden characters (FR-18); media prefixed `01-`, `02-`, … (FR-13).
- Console stays silent in normal operation (NFR-06).
- Commit messages and PRs: reference the requirement IDs they implement.

## Verification

- Unit tests: Vitest on `lib/` — serializer, anonymizer, Jira parser.
- Parser fixtures: static saved ticket pages. A captured Jira ticket page already exists in `examples/`.
- Always test the failure path: unreachable media must produce partial success + error details, not an aborted export.
- Before claiming done: build, type-check, lint, and tests all pass (each under 60 s, NFR-06).

## Commands

Run from `app/` (Node 20.19+ required — see `app/.nvmrc`; `nvm use` before running):

- `npm install` — install dependencies
- `npm run dev` — Vite dev server with HMR (includes the dev-only popup state switcher, stripped from production builds)
- `npm run build` — type-check (`tsc`) + production build to `app/dist/`; load `app/dist/` unpacked via `chrome://extensions`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint (flat config, `typescript-eslint` recommended rules)
- `npm run test` — Vitest (`lib/` suite; empty until `jira-parser`/`markdown-serializer`/`anonymizer` land)
