# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-04

## Last action

- **Closed out `add-resume-wizard` §4 Export + most of §5 (2026-07-04, `export-wiring3`
  worktree).** Built via Workflow `wf_778dafb4-995` (Wire → Tests+Vet → Verify → Checker →
  Fix), plus a manual final-checker confirmation pass and small cleanup after.
  - **4.7 wired**: `ExportStepper` (already built, previously orphaned) composed into
    `TailorWorkspace.tsx`'s export phase, replacing the old plain-text-only
    `handleExport`/`downloadTextFile`/`onExport`; dead `lib/export-text.ts`(+test) deleted;
    new `widgets/export-stepper/index.ts` FSD barrel added (was missing).
  - **Checker found + this session fixed a real blocker**: `/api/export/pdf` +
    `/api/export/docx` had **zero server-side entitlement check** (`FR-PAYWALL-01`) — any
    anonymous/free caller could POST directly with an arbitrary `ExportDocument` body and get
    a full, footer-free export, bypassing the client-only gate in `ExportStepper.tsx`. Fixed:
    both routes now resolve `currentUserId()` + check `hasPaidAccess(subscription, now)` (same
    pattern as `/api/tailor/generate`'s budget gate), returning `402 payment_required` before
    any render; broken-session/unreadable-subscription degrade to "not paid," never a raw 500
    (`NFR-OBS-01`). 6 tests each added (`route.test.ts` × 2).
  - **Final checker re-pass (separate agent, after the fix): `ship: true`, 0 blockers** —
    confirmed the gate runs before render, tests genuinely exercise anon/free/broken-session/
    unreadable-subscription/paid/malformed-body paths, no FSD violations, FR-EXPORT-04 footer
    trust boundary is sound now that only paid callers can reach the renderer at all.
  - **4.6** bundle/cold-start vet done: both routes confirmed Node runtime (not Edge), API
    route handlers never ship to the client bundle, ~20 MB combined on-disk footprint
    (pure JS, no native bindings) — no risk flagged.
  - **5.1/5.2** honesty-eval coverage confirmed already satisfied by prior-session work (no new
    tests needed): `loop.ts`'s `buildEvidenceSource` byte-match (`loop.test.ts:239-322`);
    `derive.ts`'s narrow `ClarifyingQuestionSourceRow` type + `@ts-expect-error` compile-time
    proof (`derive.test.ts:101-120`).
  - **Minor cleanup**: removed the now-dead `workspace.exportAction` i18n key (ua/en/types) —
    orphaned once `TailorWorkspace.tsx` dropped its single export button.
  - tasks.md ticked: 4.1–4.7, 5.1–5.3, 5.5. Verified: `yarn lint` clean, `yarn build` clean
    (both export routes still dynamic `ƒ`), `yarn test` = **84 files / 507 tests green**.
  - **Still open**: 3.14 (deferred, flagged, not a blocker), 5.4 (PDF/DOCX round-trip Cyrillic
    render check — needs manual visual inspection of a rendered file, not just tests), 5.6
    (sync `specs/wizard/spec.md` + `specs/bullets/spec.md` delta into baseline, archive) — do
    **not** archive the change while 3.14/5.4/5.6 are open.

- **Fixed `POST /api/tailor` "request sent, no response, no error" (2026-07-03).** Root cause:
  `claude.ts` sent `thinking: {type:"adaptive"}` with **no `effort`** → Opus 4.8 defaults to
  `high`; adaptive thinking tokens count against `max_tokens` (grounding capped at 1024), so the
  model burned the budget thinking and turns ran minutes across extract→generate→ground×N,
  blowing past the route's `maxDuration=60`. The serverless fn was killed mid-stream, the client's
  `for await` ended with **no terminal `result`/`error` event**, and the UI silently returned to
  idle. Fixes: (1) `shared/lib/llm/provider.ts` adds optional `effort: LlmEffort`; `claude.ts`
  sets `output_config:{effort}` defaulting to `"low"` (mechanical JSON tasks — fast, minimal
  thinking, verified valid on SDK 0.109). (2) `TailoringForm.tsx` now surfaces the calm `failed`
  copy if the stream closes with no terminal event (NFR-OBS-01) + regression test. (3)
  `maxDuration` raised 60→300 (`/api/tailor`, `/generate`), 60→120 (`/analyze`) — Vercel
  Fluid/Pro ceiling, clamped harmlessly on lower plans. Verified: lint + build clean, 444 tests
  green. **Not yet committed.** (Live E2E still needs `ANTHROPIC_API_KEY` set — sandbox has none.)

- **Header account menu + Profile page + Subscription link — DONE (2026-07-03, same session).**
  Subscription UI already existed at `/account/billing` (was unlinked); GDPR APIs existed
  (`DELETE /api/account`, `GET /api/account/export`) with no UI. Added:
  - `widgets/top-bar/ui/AccountMenu.tsx` (client) — CSS-drawn burger (no icon lib), a **disclosure**
    (not a WAI-ARIA menu — see below) dropdown for signed-in users. Items: Profile→`/account/profile`,
    Tailoring→`/tailor`, Usage (disabled + "coming soon", no link), Subscription→`/account/billing`,
    Logout (composes `features/sign-in` SignOutButton). `TopBar` renders it in place of the old
    inline name+SignOut group.
  - New `views/account-profile` + `/account/profile` page (mirrors `/account/billing` gating):
    identity, plan summary (links to Subscription), Refer-a-Friend coming-soon card, **GDPR
    self-serve** (export link + `features/delete-profile` two-step delete → `DELETE /api/account`).
  - i18n `accountMenu` + `profile` sections (ua+en). Tests for AccountMenu / DeleteAccountButton /
    AccountProfileView; TopBar/TopBarSession tests updated for the dropdown.
  - **Independent checker review: `ship: true`, 0 blockers.** Two `major` quality findings fixed:
    (1) dropped the `role="menu"/"menuitem"` pattern (SignOutButton `<button>` nested in a
    `menuitem` was an ARIA conflict; nav-link dropdown is correctly a disclosure — also resolves the
    no-arrow-key-nav minor); (2) grounding is honesty-critical (BC-HONESTY-01/FR-BULLETS-03) so it's
    pinned to `effort:"high"` (`GROUNDING_EFFORT` in loop.ts) with `GROUNDING_MAX_TOKENS` 1024→2048
    for thinking headroom — only extract/generate use the adapter's `low` default. FSD/DESIGN/GDPR
    flow all cleared by the checker.
  - **Open follow-up (not a blocker):** a live honesty-eval against a real provider should confirm
    `low` effort doesn't weaken extract/generate quality and `high` grounding behaves — blocked here
    by no `ANTHROPIC_API_KEY`. Grounding depth is unchanged from what shipped pre-fix, so this is
    verification, not a regression risk.

Verified after fixes: `yarn lint` clean, `yarn build` clean (`/account/profile` dynamic route),
`yarn test` = 72 files / 455 tests green. **Whole change (both parts) not yet committed.**

## Prior action

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

- **`add-resume-wizard`** — sections 1–4 DONE, section 5 mostly done (5.1–5.3/5.5 closed this
  pass, see Last action). Remaining before archive: 5.4 (PDF/DOCX round-trip Cyrillic visual
  check), 5.6 (spec sync + archive), 3.14 (deferred, non-blocking). **Whole change still NOT
  committed** — everything since `16c67ad` (this session's wiring + paywall fix + cleanup) is
  uncommitted in the `export-wiring3` worktree.
- `add-auth` remainder: password reset email (needs a sender). Google OAuth (`FR-AUTH-02`)
  DEFERRED per user 2026-07-03 — credentials-only for now.
- Also uncommitted from a prior session (still pending, see git status): the `POST /api/tailor`
  adaptive-thinking-effort fix, the usage-counter FK-violation degrade fix, and the account-menu/
  profile-page work — check `git status`/`git log` before assuming these landed; the handoff doc
  had drifted from actual commits once already this project (see Last action).

## Next steps

1. **Commit + push this session's export work**, open a draft PR.
2. **5.4** — manually render a PDF and DOCX export (a paid-tier fixture with Ukrainian text) and
   visually confirm Cyrillic glyphs render correctly in both, and the free-tier footer is present/
   absent matching entitlement.
3. **5.6** — once 5.4 is done and 3.14 is either done or explicitly accepted as deferred, sync
   `specs/wizard/spec.md` (new) + the `specs/bullets/spec.md` MODIFIED delta into baseline and
   archive `add-resume-wizard` (`openspec-archive-change`).
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
