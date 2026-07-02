# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-02

## Last action

- **`add-agent-loop` increment 1 shipped — the loop is now proven with a fake provider (2026-07-03).**
  4 new files: `shared/lib/llm/testing/fake-provider.ts` (+ test), `features/run-tailoring/index.ts`
  (slice public API), `features/run-tailoring/lib/loop.test.ts`. Gates: lint clean, build + tsc
  pass, **179 tests**. Verifier: all gates + FR/NFR evidence PASS. Checker: **ship, 0 blockers**
  (mutation-tested the honesty invariants — a real JD/requirement leak trips the isolation assert,
  so the tests aren't tautological). Both flagged NFR-SEC-02 as enforced-but-not-positively-tested
  → **fixed**: added a payload-scan case (no out-of-band user id reaches any LLM payload) + a
  TC-PURE-01 trace-level assert (parse-cv/score record no `llmPayload`). Covers add-agent-loop
  2.1/2.3/2.4/3.1/3.2 + 4.1 (`gradeTrajectory` run over the REAL run). Loop + provider port +
  Claude/ChatGPT adapters were already coded but orphaned; this made them proven and importable.
  **Uncommitted** (5 files incl. current-state) — see clean-commit note in Next steps.
- **Dev-env unblock diagnosis + `review-task` reviewer skill installed (2026-07-02).**
  - **Sign-in/sign-up 500 is NOT a code bug.** `register/route.ts` already hardened
    (catches infra throws → calm `500 {error:"server_error"}`, no stack to client, NFR-OBS-01);
    `route.test.ts` proves the calm-500 path; `auth.ts` needs `AUTH_SECRET`; `docs/dev-setup.md`
    documents all env + a self-serve `.env.local` one-shot. Root cause = **missing `.env.local`**
    (`AUTH_SECRET` + `DATABASE_URL`), a **human action** (agent deny-listed from `.env*`). The
    reported stack pointed at `route.ts:31` (now a comment) → user was on a **stale dev build**;
    fix = create `.env.local` → `yarn dev:db` (terminal A) → restart `yarn dev` (terminal B).
  - **Docker already answered:** `add-docker-dev-env` is complete (proposal+design+tasks+
    `specs/dev-environment/spec.md`, 5 reqs w/ WHEN-THEN + PRD IDs, security posture). Spec-only;
    implement when `add-agent-loop` graduates to BullMQ/Redis (TC-STACK-04). Web stays on Vercel.
  - **Installed `review-task` skill** (generic clean-context reviewer: 7 targets, 13 dimensions,
    confidence ≥80, devil's-advocate pass) at **both** `.claude/skills/review-task/` (committed)
    and `~/.claude/skills/review-task/` (user-global), **adapted to Claude Code** (`AskUserQuestion`,
    `general-purpose`/`Explore` subagent types, `{SKILL_DIR}` path placeholder, wired to Vouch
    docs). Complements the Vouch-specific `checker` subagent. Independent reviewer: **APPROVE**,
    0 findings (fidelity/adaptation/refs/consistency all confidence 100; byte-identical copies).
  - Loaded full agent operating model (settings/hooks/agents/commands/skills/openspec) via a
    6-reader workflow — Stop-hook + deny-list + maker≠checker + SDD gates all catalogued.

## Prior (done, see git log)

- Agent-engineering hardening (2026-07-02, committed): FSD ESLint boundaries, `.claude/agents/`
  checker + verifier, project permission deny-list, `perf-audit` skill, plan-first hooks.
- Auth.js v5 session + GDPR endpoints (2026-07-02, committed): `src/app/auth.ts` (JWT,
  Credentials over scrypt service), `/api/auth/register`, `GET /api/account/export` +
  `DELETE /api/account` over `shared/lib/account`; live-verified via pglite :5544 + next start.
- Landing perf NFR-PERF-04 met (2026-07-02): LCP 2.48 s / TBT 25 ms / CLS 0; evidence + re-run
  procedure in `docs/perf/log.md`. **LCP margin ≈ 20 ms** — re-audit after any landing change.
- `landing-animations` change proposed, spec only (4/4 artifacts valid); implement after
  main-flow items.

- `add-auth` core (2026-07-02): scrypt password + `registerWithPassword`/
  `authenticateWithPassword` over ports, migration `0002_auth.sql`, pglite-verified,
  no account enumeration. Open: Auth.js/session decision, Google OAuth, reset email, sign-in UI.
- `add-persistence` (2026-07-02): pg + raw SQL over `Queryable` port, AES-256-GCM CV at rest
  (`shared/lib/crypto`), cv-profile/tailoring repos, forward-only migrations, pglite-verified.
  Open: GDPR endpoints (need session helper) + checker-review.
- `add-landing-page` shipped + ARCHIVED: `views/landing` at `/`, full SEO, English copy
  (display font lacks Cyrillic — see blockers).
- Foundation P0–P4: Vitest, pure `shared/lib` scoring/i18n/llm prompt core, `shared/ui` kit,
  entities, widgets, `views/tailor-workspace` at `/tailor` (stub fixture). SDD baseline specs.

## Working on

- **`add-agent-loop` — increment 1 DONE** (verifier PASS + checker ship, 0 blockers; 179 tests).
  Next = **increment 2**: inline `/api/tailor` NDJSON streaming route (task 3.3) that resolves the
  provider at the edge (`resolveLlmProvider`) and streams `runTailoringLoop` events to the client
  (FR-TAILOR-01/02, NFR-PERF-01/02). NOTE: writing a route handler → first read the Next.js guide
  in `node_modules/next/dist/docs/` (AGENTS.md: "This is NOT the Next.js you know").
- **`add-auth` remainder** — password reset email (needs a sender). **Google OAuth (FR-AUTH-02)
  DEFERRED per user 2026-07-03 — credentials (email+pass) is the only auth for now; not blocking.**
  `add-persistence` done except checker-review (4.3).

## Next steps

### Plan (2026-07-03: add-agent-loop increment 1 — prove the loop, no API key)

Map (workflow) found the loop already coded but orphaned + untested. Increment 1 = the fake
provider + slice public API + honesty test suite the whole change assumes. Files:
1. `src/shared/lib/llm/testing/fake-provider.ts` — scriptable `LlmProvider` double; classifies
   pass by system prompt (`EXTRACTION/GENERATION/GROUNDING_SYSTEM_PROMPT`), returns parseable
   JSON, records every call (for leak scans), supports `throwOn` (fail-honest). Pure, in
   `shared/lib` (TC-PURE-01); deep-import allowed cross-slice (shared = segments).
2. `src/shared/lib/llm/testing/fake-provider.test.ts` — fake satisfies the port; classify +
   throwOn + stream≡complete.
3. `src/features/run-tailoring/index.ts` — slice public API (`runTailoringLoop`, `LoopDeps`,
   event/result types) — closes the FSD no-public-API gap.
4. `src/features/run-tailoring/lib/loop.test.ts` — 5 cases: happy path; **context isolation**
   (grounding payload contains CV sentinel, NOT jd/requirement sentinels; assert on fake calls
   AND on RunTrace ground-bullet `contextKeys`⊆{bullet,cvText}); overclaim excluded from export;
   fail-honest (throw ×3 → calm error, no result, `terminated:"failed"`); score determinism +
   zero LLM calls in score. Reuse existing `gradeTrajectory(trace)` against the REAL run (4.1).
STATUS: **increment 1 DONE** — gates green (lint/build/179 tests), verifier PASS, checker ship
(0 blockers), both NFR-SEC-02 + TC-PURE-01 findings fixed.
Then increments 2-8: `/api/tailor` NDJSON route (3.3) → wire `views/tailor-workspace` + persist
(3.4) → `paste-jd`/`upload-cv` (NEW specs) → `edit-bullet`/`toggle-overclaim` (NEW spec) →
`export-resume`+paywall (NEW spec) → BullMQ worker → add-agent-loop 4.2/4.3 + archive.

**Clean-commit note (checker):** working tree bundles 3 distinct bodies of work — commit as 3
logical commits so history + maker≠checker boundary stay clean: (1) dev-env hardening
(register try/catch, `dev:db`, `docs/dev-setup.md`, `add-docker-dev-env` spec); (2) `review-task`
skill install; (3) add-agent-loop increment 1 (the 5 files above). Awaiting user go to commit.

### Plan (2026-07-02 session: dev-env unblock + docker spec)

Trigger: local dev sign-in/sign-up broken — `[auth][error] MissingSecret` +
`Error: DATABASE_URL is not set` on `POST /api/auth/register` (raw 500). Root
cause: no `.env.local`; also register route lacks a calm failure path
(NFR-OBS-01). User also asked: evaluate Docker, plan as future spec.

1. ~~Harden `POST /api/auth/register`~~ — **done** (calm 500 `server_error`, no stack,
   NFR-OBS-01/FR-AUTH-01) + `route.test.ts` (uncommitted).
2. ~~Dev DX~~ — **done**: `dev:db` script + `docs/dev-setup.md` env table + `.env.local`
   one-shot (uncommitted).
3. ~~Docker decision → `add-docker-dev-env`~~ — **done**: spec-only change complete
   (compose PG16+Redis7, worker Dockerfile later, web on Vercel; TC-STACK-04/05, TC-DEPLOY-01).
   Implement after `add-agent-loop` needs Redis.
4. Gates: `openspec validate` **not runnable — CLI absent here** (see Blockers); structure
   conforms manually. verifier + checker subagents = maker≠checker (checker on skill install
   in flight).
5. **User action, still pending (agent cannot do):** create `.env.local` with `AUTH_SECRET`
   (`openssl rand -base64 32`), `DATABASE_URL=postgres://vouch@127.0.0.1:5544/postgres`,
   `CV_ENCRYPTION_KEY` (`openssl rand -hex 32`); then `yarn dev:db` + restart `yarn dev`.

### Plan (2026-07-02 earlier: ua rename + app flows)

1. ~~Commit sign-in UI work~~ — done (`8c4482e Added auth`, tree clean).
2. ~~Rename internal locale `uk` → `ua`~~ — done + committed, gates green (lint, 163 tests,
   build). NOTE kept: ISO 639-1 for Ukrainian is `uk`; `ua` is internal naming only — any
   future `<html lang>` / `hreflang` for Ukrainian pages must still emit `uk`.
3. **Implement `add-agent-loop`** (proposal + tasks already in `openspec/changes/`):
   provider port (1.1–1.2), skill registry (2.1–2.4, grounding context-isolated),
   bounded loop + retry (3.1–3.2), inline route-handler MVP + workspace wiring (3.3–3.4).
   Fake LLM provider in tests — `ANTHROPIC_API_KEY` only blocks live E2E, not code.
4. honesty-eval (4.1) → agent-verify (4.2) → checker-review (4.3).
5. Then `edit-bullet` (FR-EDIT-01/02) + `paste-jd` (FR-JD-01) surfaces,
   `add-payments-emulator`, `landing-animations`.

Also open: `export-resume`, `upload-cv` (TC-PARSE-01/02).

## Blockers / open questions

- **Ukrainian-first vs display font** — Bricolage Grotesque has no Cyrillic subset; landing
  shipped English. Resolve before i18n (NFR-I18N-01 / BC-BRAND-01 tension).
- **Env before launch:** `NEXT_PUBLIC_SITE_URL` (SEO defaults to `https://vouch.app`),
  `DATABASE_URL`, `CV_ENCRYPTION_KEY` (64 hex or base64 → 32 bytes), `AUTH_SECRET` (32+ bytes).
- **Google OAuth (FR-AUTH-02) deferred** per user 2026-07-03 (credentials-only for now) — no
  longer a blocker. Password reset still needs an email sender. Merchant-of-record
  (`TC-STACK-06`) undecided.
- `add-agent-loop` needs LLM SDK choice + `ANTHROPIC_API_KEY`; BullMQ/Redis not stood up.
- Agent-env: deny-list, subagents, FSD lint, `perf-audit` all done 2026-07-02. Remaining gap:
  no auto-format hook (repo has no prettier config — adding one is a human call).
- **`openspec` CLI not installed** (not a dep, not on PATH, `npx openspec` fails) — cannot run
  `openspec validate`/`--strict` despite the allow-list entries. Add it (dev dep or global) to
  restore mechanical spec validation; changes were checked structurally by hand meanwhile.
- **`review-task` skill** now available (both project + user-global). Invoke on explicit review
  requests; it spawns a fresh Task subagent. Use the Vouch `checker` for PRD/FSD/DESIGN audits.
