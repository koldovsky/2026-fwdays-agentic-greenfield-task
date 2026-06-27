# Current state — Kolo360

> Working-memory handoff between sessions. Read this first; update it after any
> meaningful change. Short and current — overwrite stale lines, don't append a log.

**Last action:** 2026-06-27 — set up project memory: added the `docs/current-state.md`
rule to `AGENTS.md` and seeded this file.

**Phase:** Planning / pre-implementation (course steps 1–7 done; about to start the
first OpenSpec slice).

## Done so far

- `docs/requirements.md` (PRD) + `docs/product-brief.md` rewritten for Kolo360.
- `DESIGN.md` written; Kolo360 design system integrated into the app
  (`app/tokens.css`, `app/globals.css`, fonts in `app/layout.tsx`); `npm run build` green.
- `AGENTS.md` expanded with full project rules (design, typing, Zod, Prisma, AI,
  verification loop, maker≠checker, state-memory).
- OpenSpec installed (`/opsx:*` commands + `.claude/skills/openspec-*`, `openspec/`).
- `docs/mvp-capability-plan.md` written (12 slices, dependency DAG, one-owner-per-FR
  coverage check passing). **Awaiting human sign-off on the plan.**

## Next step

1. Human signs off on `docs/mvp-capability-plan.md`.
2. First OpenSpec slice — recommended teaching warm-up: a pure `lib/` function
   (`add-usage-cost-calc` for `FR-USAGE-02`, or the answer-sufficiency rule
   `FR-AI-03`) via `/opsx:propose`, then test-first `/opsx:apply`.
3. Then the dependency order: slice 0 `foundation` → `shell` → …

## Open questions / blockers

- None. (Deferred to Future: real email delivery via Resend, Telegram channel, full
  360° multi-reviewer, AWS self-hosting.)
