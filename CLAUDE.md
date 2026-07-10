# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Homework for the fwdays course "Agentic Engineering: Greenfield". The project being built here is **Сервіс-деск Mini** — a minimal service-desk app (tickets for building residents) that is itself a POC of spec-driven, agent-driven development. The point is the _process_ (specs, agent cycles, verification, maker ≠ checker), not product size. Submission happens via a PR to the upstream repo reviewed by CodeRabbit (`.coderabbit.yaml`, PR template in `.github/`).

The code is currently a fresh Nx scaffold (hello-world Angular app + NestJS API). Implementation proceeds in planned agent cycles — see below.

## Project Handoff Protocol

Before planning or implementing any substantive change, read in this order — the order is deliberate, from general (state) to specific (specs):

1. `docs/current-state.md` — current state and next-step guidance (persistent memory bank: a snapshot, not a log)
2. `docs/mvp-capability-plan.md` — the working plan: MVP capability slice sequence S-01…S-08 and the per-slice Definition of Done
3. `openspec/config.yaml` — project context and slice workflow rules for OpenSpec artifacts
4. `openspec/specs/<capability>/` — current accepted behavior
5. `docs/adr/` — accepted architecture decisions

## Docs are normative (SDD)

All product/engineering decisions live in `docs/` (written in Ukrainian) and drive the implementation:

- `docs/PRD.md` — requirements with stable codes: `FR-*` (functional), `NFR-*` (non-functional), `TC-*` (technical constraints), `BC-*` (business constraints). Every requirement is normative and testable.
- `docs/mvp-capability-plan.md` — **the working plan** (Р-11): capability slices S-01…S-08 with acceptance scenarios and the per-slice Definition of Done. Maintained by the `/slice-plan` skill.
- `docs/agent-plan.md` — the cycle frame Е-1…Е-7 (order and metrics); slices map to cycles. Cycle order is fixed. If scope doesn't fit, cut features — don't stretch.
- `docs/current-state.md` — persistent memory bank (phase / done / next / blockers); update it at the end of every slice/session.
- `docs/traceability-matrix.md` — FR/NFR → slice → spec → test → demo check; update it in every slice's DoD.
- `docs/adr/` — MADR-format ADRs, immutable (change = new ADR). Engineering decisions go here; product decisions go as `Р-` entries in `docs/assumptions-open-questions.md` plus a PRD edit with changelog bump.
- `docs/glossary.md` — single source of terminology.

Key architecture decisions already fixed by ADRs (don't re-decide them):

- **ADR-0001**: Nx monorepo; Angular SPA frontend; NestJS + Prisma backend; REST/JSON + OpenAPI; MySQL.
- **ADR-0002**: single service, single container — NestJS serves the SPA static files; no reverse proxy.
- **ADR-0003**: attachments on local disk (Railway Volume), served only through the API with owner checks; single app instance.
- **ADR-0004**: auth is OTP via SMS (TurboSMS) only, no passwords; OTP store is a MySQL table; dev/test mode logs the code instead of sending SMS; session in httpOnly cookie.
- **ADR-0005**: environments are local + prod only; deploy is a Docker image on Railway; secrets only via env vars.
- **ADR-0006**: fallow is the independent static checker (dead code, dupes, complexity); `fallow audit` must pass before every commit (part of `verify`).
- **ADR-0007**: OpenSpec is the SDD working layer — PRD stays normative, `openspec/specs/` trace to FR codes and lose on conflict; one change = one capability slice.
- **ADR-0008**: trunk-based delivery — slices land as `feat(S-NN):` commits on the trunk, no working branches/PRs; the only PR is the final course submission (`.github/pull_request_template.md`).
- **ADR-0012**: the trunk is the `service-desk-mini` branch; `main` mirrors the upstream course starter and is the base of the final submission PR (`service-desk-mini` → `main` in the fork). Never commit project work to `main`.

Domain model in brief: personal workspace per user (no orgs/roles — owner sees only their own data, foreign/missing objects return 404-style), houses directory, tickets with a 5-status lifecycle (Нова → В роботі → Виконана → Закрита, plus Відхилена; only transitions from PRD §5.1 are allowed), a single append-only feed per ticket (user notes + system events), photo attachments.

## Workspace layout

Nx monorepo (plugins infer targets; see `nx.json`):

- `api/` — NestJS app, built with webpack, listens on `PORT` (default 3000) with global prefix `/api`.
- `web/` — Angular 21 app (standalone components, SCSS), dev server on 4200.
- `api-e2e/` — Jest + axios tests against the running API; `nx e2e api-e2e` builds and starts the API itself (dependsOn `api:serve`).
- `web-e2e/` — Playwright (chromium/firefox/webkit); its `webServer` starts `nx run web:serve` automatically, reuses an existing one.

## Commands

```sh
npx nx serve api            # NestJS at http://localhost:3000/api
npx nx serve web            # Angular at http://localhost:4200
npx nx build api|web
npx nx lint api|web|api-e2e|web-e2e
npx nx test api             # Jest unit tests
npx nx test web             # Angular unit tests (vitest-based @angular/build:unit-test)
npx nx e2e api-e2e          # starts API itself, then runs Jest+axios specs
npx nx e2e web-e2e          # Playwright, starts web dev server itself
npm run verify              # full blocking gate (see Quality gates) — runs before every commit via hook
npm run typecheck           # tsc --noEmit for every project tsconfig
npx fallow                  # static analysis report (dead code, dupes, complexity)
npx openspec list           # active changes (must be empty after archive)
```

Single test file: `npx nx test api -- app.controller` (positional Jest pattern). For Playwright: `npx nx e2e web-e2e -- --grep "name"`.

Stop any background `nx serve` before running `nx e2e api-e2e`: the e2e target waits for `api:serve` held by the other Nx process and fails with an opaque globalSetup error.

## Quality gates

`npm run verify` is the blocking ritual: `format:check` → `lint` → `typecheck` → `design:check` (no hardcoded colors in `web/src` styles — Material tokens `var(--mat-sys-*)` only; `tools/check-design-tokens.mjs`, В-04) → `fallow audit` → `openspec validate --all --strict` → `test` → `build`. E2e is intentionally NOT part of it (run targeted `nx e2e` specs per slice instead).

Claude Code hooks (`.claude/settings.json`, scripts in `.claude/hooks/`) enforce this automatically:

- **PostToolUse** on Write|Edit: prettier + `eslint --fix` on the edited file; unfixable errors come back as feedback — fix them immediately.
- **PreToolUse** on Bash: any command containing `git commit` first runs `npm run verify`; the commit is blocked if it fails. Expect ~1–2 min on a cold Nx cache. The hook fires BEFORE the whole command executes — never chain a fix with the commit (`prettier --write … && git commit` verifies the unfixed tree); run fixes as a separate command first. The same goes for any state-changing step chained before the commit (marking tasks.md checkboxes, doc edits): when the gate blocks, the whole command dies and that step silently never ran (S-05 lesson — run bookkeeping as its own command, then commit).

Jest compiles `api` specs with a target below ES2020: a BigInt literal (`123n`) in production code imported by a spec fails the test run even though `nx build` passes (S-08) — avoid BigInt literals in `api/src` (use `performance.now()` for timing).

Fallow config lives in `.fallowrc.json` (toolchain deps ignored, jest infra excluded). New string-referenced files (e.g. jest setup files) may show up as false "dead files" — extend the config, don't suppress inline without need. Fallow also blocks on unused dependencies: commit newly installed packages together with the code that first imports them, not ahead of it. The same goes for unused exports: export a symbol only together with its first consumer — a constant exported "for future use" blocks the commit (S-06); keep module-internal constants unexported, including classes referenced only by a decorator in their own file (e.g. an exception filter used via `@UseFilters` right below — S-07). Inherited toolchain devDependencies flagged as unused (e.g. `@nx/devkit`) belong in the config's `ignoreDependencies` list even when the slice never touched package.json. Known false positive: methods called only through an `inject()`-typed instance (e.g. from an Angular functional interceptor) are reported as `unused-class-member` — an inline `// fallow-ignore-next-line unused-class-member` with a justifying comment next to it is acceptable there.

Fallow audit gate semantics (S-03 lesson): findings on files untouched by the slice are "inherited" and excluded, but ANY edit to a file — including adding a suppression comment — pulls its old findings into the blocking gate. Two more known quirks: (1) the template scanner does not see an input read inside an `@else if (signal(); as x)` expression → false `unused-component-input`; restructure to a nested `@if` inside `@else` instead of suppressing. (2) The inline suppression for `unused-component-input` does not register (reports the issue and a "stale suppression" simultaneously) — don't burn a cycle on it. Container templates (loading/content/error state machines) can trip the template-complexity threshold; extract presentational children first (ADR-0009), and only then use the documented `// fallow-ignore-next-line complexity` above `@Component` for the irreducible branching. Clone detection flags the ADR-0009 facade selector run (identical `computed` lines in every facade) — that idiom is intentional; the inline `// fallow-ignore-next-line code-duplication` with a justifying comment registers correctly (unlike `unused-component-input`).

## Prisma/MySQL + smoke notes

- Removing an explicit `@@index` on an FK column emits NO DropIndex on MySQL — Prisma silently keeps an implicit index for the FK requirement. Hand-write the `DROP INDEX` migration (legal when a surviving composite index has the FK column first) and confirm a follow-up `npx prisma migrate dev` reports "Already in sync" — no drift (S-06).
- Smoke scripts: percent-encode non-ASCII (Cyrillic) query-string values before curl (`urllib.parse.quote(q, safe='?&=')`) — raw UTF-8 in the request line yields an empty/garbled response and a misleading parse error (S-06).

## Deploy notes (Railway)

Deploys go through `railway up` from the working copy — the service has NO GitHub integration, a `git push` never triggers a build (S-07: 10 min of polling for a build that doesn't exist). Watch progress via `railway deployment list --json`; the new deployment appears only after `railway up` finishes uploading. Variables added via the Railway dashboard stay **staged** until "Apply changes"/"Deploy" is clicked — the CLI does not see them and a deploy will not pick them up; `railway variables --set` applies immediately instead. `railway logs` with no arguments shows the latest _successful_ deployment — to read a failed one, pass its full ID: `railway logs <deployment-id>` (IDs from `railway deployment list --json`). Prod refuses to start without `TURBOSMS_TOKEN` when `SMS_MODE=turbosms` — that fail-fast is by design (ADR-0004), the previous deployment stays live. Railway's log ingestion normalizes the JSON `message` field to a string — an object-valued `message` renders empty and its fields are lost; put structured fields at the top level of the log record (they become queryable attributes) and keep `message` a human-readable string (S-08).

## Slice workflow (SDD)

The unit of work is a capability slice from `docs/mvp-capability-plan.md`. Per slice:

1. `/opsx:propose` referencing the plan item (S-NN) — proposal/spec deltas trace to FR codes, English, rules come from `openspec/config.yaml`. `openspec validate --strict` checks SHALL/MUST only against the FIRST line of a requirement paragraph (the parser takes it as the requirement text) — put the normative SHALL sentence first (S-05 lesson).
2. `/opsx:apply` — implement tasks; commits go straight to the `service-desk-mini` trunk as `feat(S-NN): …` (trunk-based, ADR-0008/0012); process work is `chore:`.
3. DoD before declaring the slice done (full list in the plan §2): all tasks `[x]`, `npm run verify`, smoke test on a real DB, Playwright e2e for the slice's critical paths, **adversarial review by the `slice-reviewer` subagent** (clean context, Sonnet model, one pass over the slice diff; critical/high findings block until fixed — ADR-0010; freeze the range at an explicit end SHA — never `..HEAD` — and make no commits until the verdict lands, so nothing ships unreviewed; a reviewer's _suggested fix_ is a hypothesis — validate it with the slice's tests before adopting, and reject with recorded evidence when it fails them, S-04 precedent), launch-and-look check, `/opsx:archive` + empty `npx openspec list` (then `npx prettier --write openspec/specs/**/*.md` — the CLI writes synced specs unformatted and verify will block the closing commit), update `docs/current-state.md` and `docs/traceability-matrix.md`, session retro via `/slice-retro` → `docs/cycles/S-NN.md`.

Skills: `/slice-plan` (generate/audit the capability plan), `/opsx:propose|apply|archive|explore|sync` (OpenSpec lifecycle), `/slice-retro` (post-slice retrospective: metrics, friction, ≤3 small process fixes applied, normative changes only proposed), `/web-conventions` (Angular conventions — read before touching `web/src`; fixed by ADR-0009: zoneless + OnPush, container/presentational, signals + facades, no NgRx).

## Conventions

- Language split: git commits, code comments, and internal docs (this file included) are in **English**; project documentation in `docs/` (PRD, ADRs, glossary, journal) and user-facing text are in **Ukrainian**. CodeRabbit reviews in Ukrainian.
- Prettier: single quotes (`.prettierrc`); ESLint flat config with Nx module-boundary rules.
- When making a product decision, record it as a `Р-` entry in `docs/assumptions-open-questions.md` and update the PRD changelog; engineering decisions get a new ADR in `docs/adr/` plus a row in its README registry. Assumptions are `П-`, open questions `В-`.
- Cost/simplicity constraints are binding: `BC-PRIN-01` "no more complex than a notebook" and `BC-GOAL-01` scope must fit ≤7 cycles.
