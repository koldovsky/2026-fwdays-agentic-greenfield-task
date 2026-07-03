# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-03

## Last action

- **Checker-review workflow (`wf_69f19f45-2c5`) results folded in + its one real finding fixed
  and committed (`764ec36`).** `add-security-hardening` had a confirmed TOCTOU race: the
  rate-limit/usage-counter gate was check-then-record-*after*-the-LLM-call, so concurrent
  requests from the same IP/account all read "under the limit" and all got charged — reproduced
  live (5 concurrent anon POSTs → 5 successes with `ANON_TAILORING_LIMIT=1`), adversarially
  re-verified (CONFIRMED). Fixed with atomic reserve/release (`reserveHit`/`releaseHit` in-memory,
  `usage_counters` `WHERE`-guarded upsert in Postgres) wired through `/api/tailor`,
  `/api/auth/register`, `/api/cv/parse`; also fixed a `/checkout` raw-throw-on-tampered-token gap
  and a `BillingPortal` test ambiguity. `add-upload-cv` and `add-payments-emulator` both
  **shipped clean (0 blockers)** in the same review. Verified: lint clean, build clean,
  **66 files / 402 tests**, including a new pglite concurrency test proving `reserve()` caps
  admissions under real parallel requests.
- **`add-resume-wizard` backend increment launched** (Workflow `wf_01e54ecb-cd1`, background,
  ~9–14 agents): loop split (`runAnalysisPhase`/`runGenerationPhase`), the
  `entities/clarifying-question` skill (2.1–2.4), evidence tagging/`BC-HONESTY-03`
  (`EvidenceSource`, `confirmedAnswers`, `evidenceKind`, prompts/parse/loop wiring,
  `BulletList` UI + i18n + bullets spec delta), and the two new `/api/tailor/analyze` +
  `/api/tailor/generate` routes — then a verify + independent checker gate. **Deliberately
  scoped OUT of this run:** tasks 1.7 (`views/tailor-workspace` wizard state machine UI) and 2.5
  (`features/clarify-tailoring` UI) — the actual UX rework is large/novel enough (replaces the
  one-shot `TailoringForm`→result flow with a 2-request analyze/confirm/clarify/generate flow,
  touches `TailorWorkspace.test.tsx`/`.paywall.test.tsx`/`.upload.test.tsx`) to deserve its own
  focused pass once the backend is verified solid, not blind fan-out. **Real gaps I found and
  resolved in the agent prompts (design.md didn't cover these):** (a) `runTailoringLoop`'s
  one-shot composition must swallow the new `analysis` event so `/api/tailor`'s wire contract
  stays byte-identical; (b) moving `score` earlier means `loop.test.ts`'s literal skills-order
  assertion AND `trajectory.ts`'s `orderOk` rank table both need updating in lockstep (design.md
  flagged the rank table but not the test); (c) design.md's `runGenerationPhase` signature
  omits `jobDescription`, which `buildGenerationPrompt` actually requires; (d) budget-gating
  split: `/generate` is the NFR-COST-02 gate (mirrors today's charge-on-result), `/analyze` gets
  only a light per-IP anti-abuse cap, no lifetime-budget consumption; (e) `deriveClarifyingQuestions`
  must be called+traced inside `runAnalysisPhase` per tasks.md 2.4, and its output added to the
  `analysis` event payload — design.md's stated event shape didn't list it. **Check
  `/workflows` or resume via the script path in the tool result for status** — do not assume
  clean until its checker's `ship`/`blockers` result is read and, if fixes were needed, the
  final `finalReview` is inspected.
- Prior session context (still accurate, condensed): `BC-HONESTY-03` policy checkpoint
  **RESOLVED** — self-attested wizard answers are grounding evidence, tagged `user-confirmed`,
  visually distinct from CV evidence; `BC-HONESTY-01` unchanged. The 5-thread plan (header fix,
  security hardening, upload-cv, payments-emulator, wizard spec) landed in commit `7df9915`.
  `add-agent-loop` (increment 1 + tasks 3.3/3.4) is done, reviewed, shipped.

## Prior (done, see git log)

- 5-thread plan (`7df9915`, `a81d42f`): session-aware header (`TopBarSession`), security
  hardening (headers/rate-limit/honeypot), drag&drop CV upload (`pdf-parse`/`mammoth`), payments
  emulator + billing portal, `add-resume-wizard` spec package.
- `add-agent-loop`: fake-provider honesty tests, `/api/tailor` NDJSON route, tailor-workspace
  wiring — verifier PASS, checker SHIP.
- Auth.js v5 session + GDPR endpoints, `add-auth` core (scrypt, no account enumeration),
  `add-persistence` (pg + `Queryable` port, AES-256-GCM CV at rest).
- Landing perf `NFR-PERF-04` met: LCP 2.48 s / TBT 25 ms / CLS 0. **LCP margin ≈ 20 ms** —
  re-audit after any landing/CSP/global-CSS change; not yet re-audited since security headers
  landed (sandbox has no Chrome — `perf-audit` blocked here, needs a machine with Chrome).
- `add-landing-page` shipped + ARCHIVED. FSD foundation: Vitest, pure `shared/lib`
  scoring/i18n/llm core, `shared/ui` kit, entities, widgets, SDD baseline specs.
- Docker: `add-docker-dev-env` spec complete, not implemented (web stays on Vercel; needed once
  BullMQ/Redis or the wizard's server-held state is built).

## Working on

- **`add-resume-wizard`** — backend increment in flight (see Last action, `wf_01e54ecb-cd1`).
  Next: read its result, fold in checker findings, THEN plan+implement the UI increment (tasks
  1.7 wizard state machine + 2.5 clarify-tailoring feature) as its own focused pass.
- `add-auth` remainder: password reset email (needs a sender). Google OAuth (`FR-AUTH-02`)
  DEFERRED per user 2026-07-03 — credentials-only for now.

## Next steps

1. **Read the `wf_01e54ecb-cd1` workflow result** (journal.jsonl in its transcript dir, or
   resume via its script path) — confirm verify gate green and checker `ship: true` (or that
   confirmed blockers were fixed and re-checked clean). Commit the increment.
2. Plan + implement `add-resume-wizard` tasks 1.7 + 2.5 (the wizard UI/state machine) as a
   separate, carefully-scoped pass — this rewrites `TailorWorkspace`'s core flow and its existing
   test suite, worth designing deliberately rather than fanning out blind.
3. Then section 4 (export: `ExportDocument` model, clipboard/PDF/DOCX, new deps
   `@react-pdf/renderer` + `docx`) — note: no Cyrillic-complete font file is bundled in the repo
   yet; npm registry + fonts.gstatic.com are both reachable from this sandbox (verified), so
   sourcing one at implementation time (e.g. a `@fontsource/*` package or a fetched static
   TTF/WOFF) is viable — check `@react-pdf/renderer`'s actual supported font formats
   (TTF/WOFF, verify WOFF2 support empirically, don't assume) before picking a package.
4. Then section 5 (honesty-evals for the wizard, final agent-verify + checker-review, sync
   `specs/wizard/spec.md` + the `specs/bullets/spec.md` delta into baseline, archive the change).
5. Re-run `perf-audit` on a machine with Chrome (blocked in this sandbox) — CSP headers landed
   since the last audit and could plausibly move the ~20 ms LCP margin.
6. Longer-tail, not blocking: `paste-jd` as its own slice, BullMQ worker, `add-agent-loop`
   4.2/4.3 + archive, FR-TAILOR-02 step-event rendering in the UI (see Blockers).
7. **User action pending:** create `.env.local` (`AUTH_SECRET`, `DATABASE_URL`,
   `CV_ENCRYPTION_KEY` — see `docs/dev-setup.md`) then `yarn dev:db` + restart `yarn dev`.

## Blockers / open questions

- **FR-TAILOR-02 step granularity** — the loop only emits `status`/`step`/one final `result`, no
  token-level streaming, and the current one-shot `TailoringForm` doesn't render `step` events.
  Real gap vs. "streams progress", not a blocker for any specific task — small follow-up.
- **`openspec` CLI not installed** — cannot run `openspec validate`; changes checked structurally
  by hand.
- **Ukrainian-first vs display font** — Bricolage Grotesque has no Cyrillic subset; landing
  shipped English. The wizard's PDF export sidesteps this with its own bundled Cyrillic font
  (design.md §4), but the web UI question is still open before wider i18n rollout.
- Env before launch: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `CV_ENCRYPTION_KEY`, `AUTH_SECRET`.
- `add-agent-loop`/wizard needs an `ANTHROPIC_API_KEY` for live E2E only (fully fake-provider
  tested without one); BullMQ/Redis not stood up yet.
- Merchant-of-record (`TC-STACK-06`) undecided. No auto-format hook (no prettier config yet).
