# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-03

## Last action

- **`add-agent-loop` task 3.4 reviewed + fixed up (2026-07-03).** Task 3.4 (tailor-workspace
  wired to the real `/api/tailor` loop) went through `verifier` (PASS: lint/build/full vitest —
  35 files, 192 tests — all green) and `checker` (**SHIP, 0 blockers**, 3 notes). Fixed the one
  actionable note: `TailorWorkspace.tsx` was calling `applyExportDefaults(next.bullets)` again
  even though `loop.ts` (features/run-tailoring/lib/loop.ts:202) already applies it before
  yielding the `result` event — duplicate ownership of the BC-HONESTY-02 invariant. Resolved by
  making the **loop** the single owner (its own `loop.test.ts` already asserts
  `includedInExport` on the raw result, so that's the real contract) and simplifying the view to
  `setBullets([...next.bullets])` — a plain mutable copy, no re-derivation. (`next.bullets` is
  `readonly Bullet[]`; the naive non-spread assignment failed `tsc` in `next build` — fixed with
  the spread.) Re-ran lint + build + full vitest after the fix: all green, `TailorWorkspace.test.tsx`
  unchanged and still passing (its scripted result already carries loop-shaped defaults). The
  other two checker notes were left alone: (a) FR-TAILOR-02 step-granularity gap — the loop only
  emits `status`/`step`/one final `result`, no token-level streaming, and `TailoringForm` doesn't
  render `step` events — pre-existing from task 3.3, checker explicitly didn't count it against
  3.4; real gap, tracked below, not a 3.4 blocker. (b) the then-current-state.md self-disclosure
  "Vitest suite NOT run this session" — stale now that verifier/checker/this pass all ran the
  full suite; corrected here.
- **Independent re-verification of task 3.4 fix pass (2026-07-03, fresh-context verifier).** Confirmed the maker's claims with real command output: `yarn lint` clean (0 errors), `yarn build` green (TS + Next build, `/api/tailor` + `/tailor` routes present), `yarn test` **35 files / 192 tests passed**. Live-smoke-tested `next start`: `GET /tailor` → 200 with CV/JD form fields present; `POST /api/tailor` with empty cv/jd → NDJSON `queued` → `error:empty_input` → `status:failed`, HTTP 200 (no raw 500, NFR-OBS-01). No new issues found beyond the pre-existing FR-TAILOR-02 step-granularity gap already logged below.
- Prior (committed): increment 1 — fake provider + loop honesty tests, 179 tests, checker-shipped
  (`b67ff52`); task 3.3 — `/api/tailor` NDJSON route (`60ed991`). Dev-env unblock diagnosis +
  `review-task` skill install also done 2026-07-02 (uncommitted, see Next steps).

## Prior (done, see git log)

- Agent-engineering hardening: FSD ESLint boundaries, `.claude/agents/` checker + verifier,
  permission deny-list, `perf-audit` skill, plan-first hooks, `review-task` reviewer skill.
- Auth.js v5 session + GDPR endpoints: `src/app/auth.ts`, `/api/auth/register`,
  `GET /api/account/export` + `DELETE /api/account`; live-verified via pglite + next start.
- Landing perf NFR-PERF-04 met: LCP 2.48 s / TBT 25 ms / CLS 0 (`docs/perf/log.md`). **LCP margin
  ≈ 20 ms** — re-audit after any landing change. `landing-animations` proposed, spec only.
- `add-auth` core: scrypt password over ports, migration `0002_auth.sql`, no account enumeration.
- `add-persistence`: pg + raw SQL over `Queryable` port, AES-256-GCM CV at rest, cv-profile/
  tailoring repos, forward-only migrations, pglite-verified. Open: checker-review (4.3).
- `add-landing-page` shipped + ARCHIVED. Foundation P0–P4: Vitest, pure `shared/lib` scoring/i18n/
  llm prompt core, `shared/ui` kit, entities, widgets, SDD baseline specs.
- Docker: `add-docker-dev-env` spec complete (compose PG16+Redis7); implement once
  `add-agent-loop` needs BullMQ/Redis. Web stays on Vercel.

## Working on

- **`add-agent-loop`** — increment 1 + tasks 3.3 + 3.4 all DONE and reviewed (verifier PASS,
  checker SHIP/0 blockers, the one actionable note fixed this pass). Gates green: lint, build,
  full vitest (35 files / 192 tests).
- `add-auth` remainder: password reset email (needs a sender). Google OAuth (FR-AUTH-02) DEFERRED
  per user 2026-07-03 — credentials-only for now, not blocking.
- **NEW — 5-thread user request (2026-07-03): session-aware header fix, security hardening,
  drag&drop CV upload, plans/subscriptions page, guided multistep wizard.** See Plan below.
  PRD updated first (spec-before-code): added `FR-WIZARD-01..05` (new capability `wizard`),
  `NFR-SEC-03/04` (headers + bot/rate-limit), `BC-HONESTY-03` (self-attested wizard answers are
  a second honest evidence source, doesn't loosen `BC-HONESTY-01`).

### Plan (2026-07-03: header fix + security + upload-cv + billing + wizard)

User asked, in priority order (security explicitly prioritized): (1) landing header still shows
"sign in" after sign-in, (2) drag&drop PDF CV upload, (3) separate plans/subscriptions page,
(4) basic bot/attack hardening — **prioritize**, check existing plans first, (5) multistep guided
wizard (JD+CV → score/feedback → confirm → clarifying Q&A → generate → export pdf/docx).

**Findings from investigation:**
- Header bug root cause: `views/landing/ui/Header.tsx` is a hand-duplicated, session-blind
  header (hardcoded "Sign in" / "Try free", no `user` prop) — separate from `widgets/top-bar`'s
  `TopBar`, which already does this correctly but only gets a session on pages that resolve it
  server-side (`/tailor`). Landing (`src/app/page.tsx`) is intentionally static/prerendered for
  `NFR-PERF-04` (LCP margin ≈ 20 ms, see Blockers) — do NOT make it read session server-side
  (would force dynamic rendering). Fix: client-side session island.
- Billing/plans: **already fully speced**, zero new spec work needed —
  `openspec/changes/add-payments-emulator/` has proposal+design+tasks+spec, all `WHEN/THEN`,
  covering FR-PAYWALL-01/02/03 + FR-BILLING-01/02/03 + TC-STACK-06 via a provider-port + emulator
  adapter (webhook is sole subscription writer, real MoR is a drop-in swap later). Just unbuilt.
- Security: `NFR-COST-02` (rate limiting) already proposed but **not implemented anywhere** —
  grepped `usage-counter`/`rateLimit` usage in `src/app|features|shared` outside tests: zero
  hits. No `middleware.ts`, no security headers in `next.config.ts`. Bot/basic-attack mitigation
  wasn't in the PRD at all before this session — added `NFR-SEC-03/04` above.
- Upload-cv: `FR-CV-01/03` + `TC-PARSE-01/02` already exist in the PRD (status `proposed`,
  library "TBD") — no new PRD IDs needed, just a new OpenSpec change + implementation.
- Wizard: genuinely new capability, biggest surface, changes the honest-pipeline shape (adds a
  pause + a new clarifying-question evidence source). New `FR-WIZARD-*` + `BC-HONESTY-03` added
  above. **Spec + design only this pass — do not implement without a checkpoint** (the
  self-attested-evidence policy is a brand-trust call worth the user reading before code, see
  Blockers).

**Scope for this pass** (priority order, security first per user):
1. **Landing header fix** (bug fix, no new spec) — implement now.
2. **`add-security-hardening`** (NEW OpenSpec change, `NFR-SEC-03/04` + enforce `NFR-COST-02`) —
   spec + implement now.
3. **`add-upload-cv`** (NEW OpenSpec change, `FR-CV-01/03`, `TC-PARSE-01/02`) — spec + implement
   now (PDF via `pdf-parse`, DOCX via `mammoth`).
4. **`add-payments-emulator`** (spec already complete) — implement per its existing `tasks.md`
   now (provider port, emulator adapter, checkout, webhook, paywall, billing portal).
5. **`add-resume-wizard`** (NEW OpenSpec change) — spec + design only. Flag the
   `BC-HONESTY-03` policy call to the user before building.

**File-level steps:**

1. Header fix:
   - `src/app/providers.tsx` (NEW, client): wraps children in next-auth/react `SessionProvider`.
   - `src/app/layout.tsx`: wrap `{children}` in `<Providers>`.
   - `src/widgets/top-bar/ui/TopBarSession.tsx` (NEW, client): calls `useSession()`, renders the
     existing presentational `TopBar` with the resolved user (loading state ≈ anon state, no
     layout shift). Export from `widgets/top-bar` barrel.
   - `src/views/landing/ui/Header.tsx`: delete; `Landing.tsx` renders `<TopBarSession />`
     instead (dedupes header markup with `TopBar`, matches `FR-SHELL-01`). Footer keeps
     `navLinks` from `lib/content.ts` (still used there).
   - Re-run `perf-audit` after (landing markup changed, `NFR-PERF-04` margin is thin).
2. `openspec/changes/add-security-hardening/` (proposal, design, tasks, `specs/security/spec.md`
   mirroring the `add-payments-emulator` format) +:
   - `next.config.ts`: `headers()` — CSP, `X-Frame-Options`, `X-Content-Type-Options`,
     `Referrer-Policy`, `Permissions-Policy` on all routes (`NFR-SEC-03`).
   - `shared/lib/rate-limit` (NEW, pure + injectable clock/store, `TC-PURE-01`): sliding-window
     per-IP counter port; in-memory adapter for dev/single-instance (note: needs Redis for
     multi-instance prod, ties to the already-speced `add-docker-dev-env` Redis).
   - Wire `usage-counter` (already exists, unused) + the new rate-limiter into
     `POST /api/tailor` and `POST /api/auth/register`: enforce `NFR-COST-02` (2 lifetime / user,
     1 per IP per 24h anon) and `NFR-SEC-04`; failures are calm `429`-style NDJSON/JSON errors,
     never a raw exception (`NFR-OBS-01`).
   - Honeypot hidden field on `TailoringForm` + `SignInForm` sign-up mode; silently drop (fake
     success path, never reveal detection) submissions with it filled.
3. `openspec/changes/add-upload-cv/` (proposal/design/tasks/spec) +:
   - `pdf-parse` + `mammoth` deps.
   - `shared/lib/parse-document` (NEW, server-only IO — if this breaks the `TC-PURE-01`
     "no Node/DOM IO" convention other `shared/lib` modules follow, isolate it in its own
     segment/test convention rather than forcing purity onto real file parsing; decide at
     implementation time).
   - `features/upload-cv` (NEW slice): drag&drop dropzone UI + `POST /api/cv/parse` route handler
     (extracts text server-side, client never sees raw binary, `TC-PARSE-01/02`) feeding the
     existing CV textarea in `TailoringForm` (`FR-CV-01` alongside existing `FR-CV-02` paste).
4. `add-payments-emulator`: implement per its own `tasks.md` 1.1–4.3 (already written, cited
   above) — provider port, emulator adapter + `/checkout`, webhook (sole subscriptions writer),
   `widgets/paywall` + `features/upgrade`, `widgets/billing-portal`, a `views/account-billing`
   page (the literal "separate page for plans & subscriptions").
5. `openspec/changes/add-resume-wizard/` (NEW, spec + design ONLY, no code this pass):
   proposal.md, design.md (state machine: analyze → confirm → clarify → generate → export;
   clarifying questions derived from `partial`/`gap` checklist rows' keywords; answers feed
   generation as a second tagged evidence source per `BC-HONESTY-03`), tasks.md,
   `specs/wizard/spec.md` (`WHEN/THEN` per `FR-WIZARD-01..05`, plus finally implementing
   `FR-EXPORT-01..04` as the wizard's terminal step — PDF/DOCX libs TBD in the design doc).
6. Gates per implemented thread (1–4): lint, build, full vitest. verifier + checker subagents.
   `perf-audit` after the header fix specifically.

## Next steps

1. Execute the plan above, threads 1–4, via parallel implementation + independent verify/review.
2. Author `add-resume-wizard` spec package; present the `BC-HONESTY-03` evidence-policy call to
   the user before writing any wizard code.
3. **Commit as separate logical commits** (tree bundles several sessions' work, still uncommitted
   from before this session too): (a) dev-env hardening, (b) `review-task` skill install,
   (c) add-agent-loop increment 1, (d) add-agent-loop task 3.4, (e) this session's threads,
   each as their own commit. Awaiting user go to commit.
4. Then: `paste-jd` as its own slice (currently folded into `run-tailoring`'s `TailoringForm`),
   `edit-bullet`/`toggle-overclaim` (NEW spec), BullMQ worker, add-agent-loop 4.2/4.3 + archive.
5. **User action pending:** create `.env.local` (`AUTH_SECRET`, `DATABASE_URL`,
   `CV_ENCRYPTION_KEY` — see `docs/dev-setup.md`) then `yarn dev:db` + restart `yarn dev`.

## Blockers / open questions

- **`BC-HONESTY-03` policy checkpoint (2026-07-03):** the resume wizard's clarifying-Q&A step
  (`FR-WIZARD-02/03/04`) needs user-confirmed answers to count as grounding evidence alongside
  CV text, or the wizard can't do anything the current one-shot flow doesn't. Default written
  into the PRD/spec: self-attested answers ARE honest evidence, always tagged distinctly from
  CV-sourced evidence in the UI. This is a brand-trust call (Vouch's differentiator is honesty)
  — confirm this default with the user before implementing `add-resume-wizard` code.
- **FR-TAILOR-02 step granularity** — `runTailoringLoop` only emits `status`/`step`/one final
  `result`, no token-level streaming, and `TailoringForm` doesn't render the `step` events it does
  get. Checker flagged this as pre-existing (from task 3.3) and not a 3.4 blocker, but it's a real
  gap vs the "streams progress" reading of FR-TAILOR-02 — worth a small follow-up increment
  (render `step` events in the form) before calling the loop UX complete.
- **`openspec` CLI not installed** (not a dep, not on PATH) — cannot run `openspec validate`;
  changes checked structurally by hand meanwhile.
- **Ukrainian-first vs display font** — Bricolage Grotesque has no Cyrillic subset; landing
  shipped English. Resolve before wider i18n rollout (NFR-I18N-01 / BC-BRAND-01 tension).
- Env before launch: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `CV_ENCRYPTION_KEY`, `AUTH_SECRET`.
- `add-agent-loop` needs an `ANTHROPIC_API_KEY` for live E2E only (code path is fully
  fake-provider tested without one); BullMQ/Redis not stood up yet.
- Merchant-of-record (`TC-STACK-06`) undecided. No auto-format hook (no prettier config yet).
