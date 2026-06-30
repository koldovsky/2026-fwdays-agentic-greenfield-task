## Read first — project docs

Before starting any task, read the docs in `docs/` and treat them as authoritative:

- **`docs/requirements.md`** — the numbered, traceable **source of truth** (FR/NFR/TC/BC
  IDs). Every change must trace to one or more IDs; reference them in commits and PRs.
- **`docs/product-brief.md`** — the narrative behind the requirements (what the product
  is, who it's for, scope boundary). Read it for intent when an ID is ambiguous.
- **`docs/current-state.md`** — the running log of what was done and where things stand.
  **Read it at the start of every session** to pick up context, and **update it at the
  end of your work** (see below). Treat the requirements doc, not this file, as ground
  truth — `current-state.md` is a memory aid, not a spec.

### Keep `docs/current-state.md` current (required)

At the end of any session that changes the repo, append/update an entry in
`docs/current-state.md` describing:

- **Timestamp** of the action (ISO 8601, e.g. `2026-07-01T00:40:00Z`).
- **What was done** — a short summary of the change and the FR/NFR/TC IDs it touched.
- **State now** — what works/verified, what's in progress, and any known issues.
- **Next steps** — the obvious follow-up so the next session can resume quickly.

Newest entry first. Keep it concise; it is a hand-off note, not a changelog of every file.

## Monorepo

- **npm workspaces** (`apps/*`, `packages/*`). Install once from the repo root
  (`npm install`) — deps hoist to the root `node_modules`; never run install inside a
  package.
- Packages:
  - `@honeydo/shared` (`packages/shared`) — framework-free TS contracts + pure logic.
    Compiles to CommonJS in `dist/`; **build it before the apps** (`npm run build -w
    @honeydo/shared`) since consumers resolve its types from `dist/`.
  - `@honeydo/api` (`apps/api`) — NestJS + Prisma. Local run: `npm run db:up`
    (Postgres via `docker-compose.yml`, host port **5434**) → `npm run migrate` →
    `npm run api`. Server listens on `:3000` (`GET /health`). Needs `apps/api/.env`
    with `DATABASE_URL` (copy `.env.example`); `prisma generate` runs on install via
    `postinstall`. Note: `PrismaService` connects on boot, so the DB must be up.
  - `@honeydo/mobile` (`apps/mobile`) — Expo SDK 57 + TypeScript. Run with
    `npm run mobile` (or `npm run start -w @honeydo/mobile`); `metro.config.js` is
    set up for the monorepo (watches the root, resolves hoisted deps).

## Repository map & placement rules

- `packages/shared/` — framework-free TS only. Pure logic (duration, aggregation,
  streak, insight-shaping) + API type contracts. NEVER import Nest, Prisma, RN,
  or node built-ins here. If logic is pure, it goes here — not in an app.
- `apps/api/` — NestJS. Controllers/services/modules. Prisma client lives ONLY
  here. Import shared types from `@honeydo/shared`, never duplicate them.
- `apps/mobile/` — Expo/RN. Screens, components, hooks. Consume the API over REST;
  import contract types from `@honeydo/shared`. Never import the Prisma client.
- Tests live next to the code they cover (`*.test.ts`); pure logic in
  `packages/shared` must stay 100% unit-tested (see TC-PURE-01).
- New cross-cutting domain type → `packages/shared`. New endpoint → `apps/api`.
  New screen/widget UI → `apps/mobile`.

## Design system

- **`DESIGN.md` is the production design reference** — read it before building or
  changing any `apps/mobile/` UI. The full source (tokens, components, guidelines,
  UI kit, brand specimens) is installed as a skill at
  `.agents/skills/honeydo-design/`; invoke the `honeydo-design` skill for prototypes
  or deep design work.
- **Tokens only, never raw hex** in app code. Color/spacing/radius/type/motion all
  come from named tokens (centralized as a typed theme in `apps/mobile/`). Light/Dark
  must stay a token swap; Dark is the default. Keep the RN theme object in sync with
  `.agents/skills/honeydo-design/tokens/` — those CSS files are the source of truth.
- The skill's `.css`/`.jsx` are **reference, not a dependency** — `apps/mobile` is
  Expo/RN; port values into the theme, don't ship the web files.

## Workflow

- Spec/requirement IDs in `docs/requirements.md` are the source of truth; reference
  the FR/NFR/TC ID in commits and PRs (see "Read first — project docs").
- Capabilities and build order: `docs/implementation-plan.md` + `docs/capabilities/`.
  Implement with OpenSpec (one change per capability, in order).
- Test-first on shared logic. Separate review pass before merge (maker ≠ checker).
- End each work session by updating `docs/current-state.md`.
- **Review changes before committing.** Read the full diff (`git diff` / staged diff)
  and run a review pass — use `/code-review` (or the `requesting-code-review` skill) —
  before every commit. Confirm `lint`, `typecheck`, and `test` pass on what you're about
  to commit; fix or explicitly note findings. Never commit unreviewed or red changes.
- **Commit after every change to the `dev` branch.** Work on `dev` (branch from `main`
  if it doesn't exist); make a focused commit per logical change — never leave the tree
  uncommitted at the end of a task. Reference the relevant FR/NFR/TC ID in the message.
  Don't commit to `main` directly; `main` advances only via reviewed merges from `dev`.
