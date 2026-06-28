# Current state — Kolo360

> Working-memory handoff between sessions. Read this first; update it after any
> meaningful change. Short and current — overwrite stale lines, don't append a log.

**Last action:** 2026-06-28 — implemented slice `add-foundation`: Prisma data model
(`prisma/schema.prisma`, 9 models + 4 enums), shared client `lib/db/`, `prisma.config.ts`,
`.env.example`. Adapted to Prisma 7 (URLs out of schema → config + driver adapter). Schema
validates + client generates offline; full loop green. No migration, no DB provisioned yet.

**Phase:** Implementation. Foundation built and archived; next slice is `shell`.

## Done so far

- `docs/requirements.md` (PRD) + `docs/product-brief.md`, `DESIGN.md`, design system in
  the app, `AGENTS.md` rules, OpenSpec, `docs/mvp-capability-plan.md` (12 slices).
- **Slice `add-token-cost-calculator`** (FR-USAGE-02/-04, TC-AI-02/PURE-01/VALID-01/TS-01):
  - `lib/schemas/usage.ts` — Zod price-entry / price-table / token-counts schemas (+ `z.infer` types).
  - `lib/ai/pricing.ts` — `SEED_PRICE_TABLE` (opus $5/$25, sonnet $3/$15, haiku $1/$5 per 1M).
  - `lib/ai/cost.ts` — pure `cost(modelId, in, out, priceTable=seed)`; throws `UnknownModelError`.
  - `lib/ai/*.test.ts` — 8 Vitest specs (known/zero/custom-table/unknown-model/bad-counts).
  - Infra: installed `zod` + `vitest`, added `vitest.config.ts` (`@/` alias) and `test`/`typecheck`
    scripts; `eslint.config.mjs` now ignores vendored `docs/**`.
  - Independent review (maker≠checker): passed — tsc/lint/8 tests green, no any/casts,
    spec-faithful. Archived.
- **Slice `add-foundation`** (TC-STACK-02/-04, TC-DEPLOY-01) — data model laid down:
  - `prisma/schema.prisma` — 9 models (Employee, Template, Question, Cycle, Response,
    Answer, Dialog, Summary, UsageRow) + 4 enums; unique email/token; JSON for snapshot,
    anchors, dialog messages, summary content.
  - **Prisma 7 break:** connection URLs left the schema → `prisma.config.ts` (migration URL)
    + runtime driver adapter `@prisma/adapter-pg` in `lib/db/index.ts` (pooled `DATABASE_URL`).
  - `lib/db/index.ts` — one shared `db` client, globalThis-cached, no casts.
  - `.env.example` — `DATABASE_URL` + `DIRECT_URL` placeholders (`.env` gitignored).
  - Neon Postgres provisioned; first migration `20260628060745_init` applied via the direct
    endpoint (`prisma.config.ts` loads `.env.local` for `DIRECT_URL`). Full loop green
    (lint/tsc/8 tests/build). Synced spec → `openspec/specs/data-model/` and archived.

## Next step

1. Next slice: `shell` (auth + cabinet shell, FR-AUTH/FR-SHELL) per the dependency order in
   `docs/mvp-capability-plan.md`. Propose via `/opsx:propose`, then `/opsx:apply`.
2. Reminder (maker≠checker): a separate review pass should verify the archived foundation
   slice's code before it is relied on.
3. Done: Neon Postgres provisioned and migrated (`init`). `DATABASE_URL` (pooled, runtime)
   and `DIRECT_URL` (direct, migrations) are set in `.env.local`.

## Open questions / blockers

- None. (Deferred to Future: real email delivery via Resend, Telegram channel, full
  360° multi-reviewer, AWS self-hosting.)
