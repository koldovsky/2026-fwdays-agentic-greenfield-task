# Current state

Running hand-off log. **Newest entry first.** Read at the start of a session; append
at the end of one. `docs/requirements.md` is ground truth — this file is a memory aid.
See AGENTS.md → "Read first — project docs" for the format.

---

## 2026-06-30T21:55Z — Per-capability docs + git workflow on `dev`

**Done:** Added `docs/capabilities/` (one file per capability, numbered by build order, with
FR/NFR/TC mapping, scope, non-goals, risks) + an index. Added an AGENTS.md rule: **commit after
every change to the `dev` branch** (branch from `main`, focused commits, reference IDs, never
commit to `main` directly). Created the `dev` branch and committed all prior uncommitted work in
4 focused commits (scaffold, design system, openspec init, docs). Gitignored
`.claude/settings.local.json`.

**State now:** On `dev`, working tree clean. `main` unchanged (advances via reviewed merge).
Capabilities documented; OpenSpec specs/changes still not scaffolded.

**Next steps:** Resolve the brand decision, then `openspec new change add-auth` and implement
test-first — committing each step to `dev`.

---

## 2026-06-30T21:45Z — Capability split + implementation order (OpenSpec)

**Done:** Wrote `docs/implementation-plan.md` — splits `requirements.md` into 10 OpenSpec
capabilities (+ a foundation phase) with full FR/NFR/TC ID mapping, a dependency graph, a
phased build order, cross-cutting concerns, and risks. Maps each capability to a candidate
`openspec/changes/add-<capability>/` proposal. OpenSpec is initialized (CLI 1.4.1; `specs/`
still empty).

**State now:** Plan only — no specs/changes scaffolded yet. Recommended first change:
`openspec new change add-auth`. Note the brand-mismatch risk gates any UI work (Phase 1).

**Next steps:** Resolve the honey-vs-blackwork brand decision, then scaffold `add-auth` as the
first OpenSpec change and implement test-first.

---

## 2026-06-30T21:41Z — Project docs wired into AGENTS.md

**Done:** Added a "Read first — project docs" section to AGENTS.md instructing agents to
use `docs/requirements.md` (source of truth) + `docs/product-brief.md` (narrative), and
to maintain this `current-state.md` each session. Bootstrapped this file.

**State now:** Convention documented and seeded. No code changed.

**Next steps:** Begin implementing against the requirements (auth / app-shell / time-entries
core loop). Note an unresolved brand mismatch: the brief/PRD describe a "dark/blackwork-leaning"
identity, but the integrated design system (DESIGN.md, `honeydo-design` skill) is a warm
honey theme — reconcile which is canonical before building UI (FR-THEME-*, BC-BRAND-01).

---

## 2026-06-30T21:34Z — Local Postgres + API boot verified end-to-end

**Done:** Added `docker-compose.yml` (Postgres 16, host port **5434** to avoid clashes with
other local Postgres on 5432/5433). Root scripts `db:up`/`db:down`/`db:reset`. Updated
`apps/api/.env` + `.env.example` to port 5434. Ran first Prisma migration (`init`) creating
the `TimeEntry` table. Touches TC-STACK-03.

**State now:** `npm run db:up` → `npm run migrate` → `npm run api` works. Server boots,
connects to Postgres, `GET http://localhost:3000/health` returns the shared `HealthStatus`.
Container `honeydo-pg` may still be running.

**Next steps:** Build real endpoints (time-entries CRUD) with class-validator DTOs (TC-STACK-02),
backed by `PrismaService`. Add auth (FR-AUTH-*).

---

## 2026-06-30T21:15Z — Backend scaffolded: @honeydo/api + @honeydo/shared

**Done:** Scaffolded NestJS 11 app `@honeydo/api` (`apps/api`) with Prisma (pinned 6.19.3;
Prisma 7 dropped `url` in schema), a global `PrismaModule`/`PrismaService`, `ConfigModule`,
and a `GET /health` endpoint returning the shared `HealthStatus` type. Created framework-free
`@honeydo/shared` (`packages/shared`): API contracts (`contracts.ts`) + tested pure duration
logic (`duration.ts`, 5 passing tests). Unified TypeScript to `~6.0.3` across packages and made
the api tsconfig TS-6-clean. Touches TC-STACK-02/03, TC-PURE-01, TC-TEST-01.

**State now:** All green — `shared` build (CJS) + tests, `api` build + test, `mobile` typecheck.

**Next steps:** See entry above (DB/run) — now done.

---

## 2026-06-30T23:15Z (local) — Mobile app scaffolded + design system integrated

**Done:** Set up npm-workspaces monorepo root. Scaffolded Expo SDK 57 + TS app `@honeydo/mobile`
(`apps/mobile`) with monorepo `metro.config.js` and a typed design-token theme (`src/theme/`,
`useTheme()`). Installed the design system as the `honeydo-design` skill and wrote `DESIGN.md`
(production token reference, RN mapping). Touches TC-STACK-01, FR-THEME-03.

**State now:** `mobile` typechecks; starter screen renders from tokens. Run with `npm run mobile`.

**Next steps:** Build the app shell + tab navigation (FR-SHELL-01). Reconcile brand mismatch
flagged in the top entry.
