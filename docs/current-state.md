# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-03

## Last action

- **`add-resume-wizard` backend increment committed (`996d0ba`).** Implements tasks.md sections
  1 (minus 1.7), 2 (minus 2.5), 3 in full: `runTailoringLoop` split into `runAnalysisPhase`
  (parse-cv → extract-requirements → score → derive-clarifying-questions) +
  `runGenerationPhase` (generate-bullet → ground-bullet*), each independently `STEP_CAP`-bounded;
  new `POST /api/tailor/analyze` (light per-IP anti-abuse cap only) + `POST /api/tailor/generate`
  (the real `NFR-COST-02` budget gate, atomic reserve/release); `entities/clarifying-question`
  (`deriveClarifyingQuestions` — pure, template-based, no LLM, input narrowed to
  `partial`/`gap` rows' `{text, keywords, importance, status}` only); `BC-HONESTY-03` evidence
  tagging (`Bullet.source: EvidenceSource` = `cv` | `user-confirmed`, `confirmedAnswers` pool
  threaded through both prompts as a distinct labeled block, `BulletList` renders both kinds
  with distinct labels, same badge color). `/api/tailor`'s one-shot NDJSON contract is untouched
  (the composed loop swallows the intermediate `analysis` event).
  - Built via Workflow `wf_01e54ecb-cd1` (14 agents across Foundations → Loop split →
    Routes+UI → Verify → Checker → Fix blockers; hit the session rate cap once mid-run, resumed
    cleanly from cache after reset).
  - **Independent checker review caught 2 real honesty bugs, both fixed + re-verified clean
    (final `ship: true`, 0 blockers):** (1) a grounding verdict tagged `user-confirmed` whose
    evidence text didn't byte-match a real confirmed answer was silently relabeled as
    CV-sourced — i.e. a paraphrase could render as fabricated "from your CV" text; fixed to
    require an exact byte-match or the bullet downgrades to `overclaim-risk` with no source.
    (2) `trajectory.ts`'s `GROUNDING_ALLOWED` set didn't include the new `confirmedAnswers`
    context key, so the honesty eval (`gradeTrajectory`) false-flagged every legitimate
    confirmed-answer-grounded run as a grounding-isolation violation; fixed by widening the
    allow-list (JD/requirements/generation transcript are still excluded — isolation widens,
    never loosens).
  - **Three design.md gaps I found and resolved while writing the implementation prompts**
    (worth knowing if touching this code): `runGenerationPhase`'s input needs `jobDescription`
    (design.md's stated signature omitted it, but `buildGenerationPrompt` requires it); the
    `analysis` event payload needs `clarifyingQuestions` (also not in design.md's stated shape,
    but tasks.md 2.4 requires tracing+surfacing them); moving `score` earlier required updating
    BOTH `trajectory.ts`'s rank table AND `loop.test.ts`'s literal skills-order assertion
    (design.md flagged only the former).
  - **Independently re-verified this session** (not just trusted the workflow's own report):
    `yarn lint` clean, `yarn build` clean (both new routes present as dynamic `ƒ` routes),
    `yarn test` **69 files / 441 tests, all green** (up from 66/402 baseline). Live NDJSON
    smoke-tested against `next start`: calm coded failures on both new routes (never a raw 500),
    `/analyze`'s anti-abuse cap trips independently of `/generate`'s lifetime budget, failed
    `/generate` reservations correctly refund (fired interleaved failing requests across
    `/api/tailor` and `/api/tailor/generate` from the same IP — shared `ANON_TAILORING_LIMIT`
    key never falsely tripped). `openspec/changes/add-resume-wizard/tasks.md` checkboxes synced
    to match (1.1–1.6, 2.1–2.4, 3.1–3.13 checked; 1.7, 2.5, 3.14, sections 4–5 still open).
- **Checker-review workflow (`wf_69f19f45-2c5`) results folded in + fixed, committed (`764ec36`).**
  `add-security-hardening` had a confirmed TOCTOU race: rate-limit/usage-counter gate was
  check-then-record-*after*-the-LLM-call, so concurrent requests all read "under the limit" and
  all got charged (reproduced live: 5 concurrent anon POSTs → 5 successes with limit=1). Fixed
  with atomic reserve/release, wired through `/api/tailor`, `/api/auth/register`,
  `/api/cv/parse`. `add-upload-cv` and `add-payments-emulator` both shipped clean (0 blockers)
  in the same review.
- `BC-HONESTY-03` policy checkpoint **RESOLVED** (2026-07-03, user-approved default):
  self-attested wizard answers are grounding evidence, tagged `user-confirmed`, visually
  distinct from CV evidence; `BC-HONESTY-01` unchanged.

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

- **`add-resume-wizard`** — backend increment (sections 1–3, minus UI) done + committed. Next
  increment: tasks 1.7 + 2.5, the wizard UI/state machine.
- `add-auth` remainder: password reset email (needs a sender). Google OAuth (`FR-AUTH-02`)
  DEFERRED per user 2026-07-03 — credentials-only for now.

## Next steps

0. **User-reported: `POST /api/tailor` returns calm `{"error":"failed"}` in ~17ms.** Diagnosed:
   this is `getAnthropicApiKey()` (`shared/config/env.ts`) throwing synchronously because
   `ANTHROPIC_API_KEY` isn't set in `.env.local` — 17ms is way too fast to be a real LLM attempt,
   matches the documented pre-existing blocker (`docs/dev-setup.md`). NOT a code bug — agents
   cannot read/write `.env*` (deny-list), so the user must add the key themselves and restart
   `yarn dev`. Real gap found alongside it: none of `/api/tailor`, `/api/tailor/analyze`,
   `/api/tailor/generate`'s outer catch blocks log the caught error server-side — every failure
   (missing key, malformed model output, network error) is indistinguishable in the console.
   Fixing: add `console.error` (server-side only, client NDJSON contract unchanged) to each
   route's outer catch. NFR-OBS-01 covers hiding failures from *end users*, not from operators.
1. **Plan + implement `add-resume-wizard` tasks 1.7 + 2.5** (wizard UI/state machine) as its own
   focused pass, not blind fan-out — replaces the one-shot `TailoringForm`→result flow in
   `views/tailor-workspace` with a multi-step `analyze | confirm | clarify | generate | export |
   failed` flow (`FR-WIZARD-05` labels) calling the now-live `/api/tailor/analyze` +
   `/api/tailor/generate` routes and rendering `clarifyingQuestions` via a new
   `features/clarify-tailoring` slice. Touches `TailorWorkspace.test.tsx` /
   `.paywall.test.tsx` / `.upload.test.tsx` — read them closely before rewriting the flow.
2. Then section 4 (export: `ExportDocument` model, clipboard/PDF/DOCX, new deps
   `@react-pdf/renderer` + `docx`) — no Cyrillic-complete font file is bundled in the repo yet;
   npm registry + fonts.gstatic.com are both reachable from this sandbox (verified), so sourcing
   one at implementation time is viable — check `@react-pdf/renderer`'s actual supported font
   formats (TTF/WOFF; verify WOFF2 support empirically, don't assume) before picking a package.
3. Then section 5 (honesty-evals for the wizard, final agent-verify + checker-review, sync
   `specs/wizard/spec.md` + the already-landed `specs/bullets/spec.md` delta into baseline,
   archive the change).
4. Re-run `perf-audit` on a machine with Chrome (blocked in this sandbox) — CSP headers landed
   since the last audit and could plausibly move the ~20 ms LCP margin.
5. Longer-tail, not blocking: `paste-jd` as its own slice, BullMQ worker, `add-agent-loop`
   4.2/4.3 + archive, FR-TAILOR-02 step-event rendering in the UI (see Blockers).
6. **User action pending:** create `.env.local` (`AUTH_SECRET`, `DATABASE_URL`,
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
