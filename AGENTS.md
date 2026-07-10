<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TinyStart — Agent Rules

You are building **TinyStart**, a calm, ADHD-informed focus app. **Do not invent features, copy, or UX patterns** — implement only what the specs define.

## Specification hierarchy

| Priority | Document | Use for |
|----------|----------|---------|
| 1 | [`docs/requirements.md`](docs/requirements.md) | **Source of truth** — all `FR-*`, `NFR-*`, `TC-*`, `BC-*` IDs, MVP acceptance criteria, out-of-scope list |
| 2 | [`docs/APP_SPEC.md`](docs/APP_SPEC.md) | Scope (§6), flows (§7), routes (§8), screens (§9), architecture (§11), data model (§12), copy bank (§17), phases (§16) |
| 3 | [`docs/design.md`](docs/design.md) | Tokens, components, typography, motion — **wins over APP_SPEC for visual design** |
| 4 | [`docs/product-brief.md`](docs/product-brief.md) | Narrative context when requirements need interpretation |

**Conflict resolution:** visual design → `design.md`; scope/behavior → `requirements.md`.

## What to read per task

| Task type | Read first |
|-----------|------------|
| New feature / screen | Matching rows in `requirements.md`, then `APP_SPEC.md` screen + flow sections |
| UI / styling | `design.md` (§3–§11); copy from `APP_SPEC.md` §17 |
| `lib/` logic | `APP_SPEC.md` §12 + `TC-PURE-01`, `TC-STACK-05` in `requirements.md` |
| Scope / priority question | `APP_SPEC.md` §6, `requirements.md` out-of-scope + MVP acceptance |
| Verification / review | `requirements.md` MVP acceptance + all `BC-*`; flows in `APP_SPEC.md` §7 |

## Scope

- **MVP only** unless the user explicitly expands scope — see `APP_SPEC.md` §6 and `requirements.md` out-of-scope.
- **P0 before P1** — daily recap (`/recap`) is P1; defer until P0 ships.

## Non-negotiable constraints

Always enforce **every** `BC-*` row in `requirements.md` and related `FR-*` / `NFR-*` cited there. Key themes (details in spec): shame-free calm UX, one primary CTA per screen, single-task focus mode, autosave, device-local privacy, accessible keyboard + screen reader support.

## Technical & design

- **Stack, persistence, tests, quality gate:** all `TC-*` and `NFR-DX-01` in `requirements.md`.
- **Routes & folder layout:** `APP_SPEC.md` §8 and §11 — do not invent alternate structure.
- **Data model:** `APP_SPEC.md` §12 (`TC-DATA-01`).
- **UI implementation:** follow `design.md` end-to-end; light theme only for MVP (`design.md` §2).

## React / Next.js performance

Apply [`.agents/skills/vercel-react-best-practices/`](.agents/skills/vercel-react-best-practices/) when writing or reviewing React/Next.js code. For `localStorage`, follow `client-localstorage-schema`.

## Agent workflow

### Before implementing

1. Note which requirement IDs (`FR-*`, etc.) the task satisfies.
2. Read the matching sections in `requirements.md`, `APP_SPEC.md`, and `design.md` (if UI).
3. Confirm MVP scope.

### While implementing

- Match existing conventions; minimal diffs; no unrelated refactors.
- Cite requirement IDs in commits/PRs when possible.
- No new dependencies without clear need.

### After implementing

- Verify against **MVP acceptance criteria** in `requirements.md`.
- Run `npm run lint && npm run build` (`NFR-DX-01`).
- Add/update unit tests for `lib/` logic (`TC-STACK-05`).

### Maker ≠ checker

1. Verify claimed requirement IDs.
2. Walk core flows (`APP_SPEC.md` §7).
3. Audit all `BC-*` constraints — timer, CTA count, shame-free copy.
4. Flag scope creep into V1/Future (`APP_SPEC.md` §6).

## Documentation updates

On scope or behavior change: update `requirements.md` (status/IDs), `APP_SPEC.md` (date + changelog), `design.md` (visual only). Do not expand scope silently — ask the user first.
