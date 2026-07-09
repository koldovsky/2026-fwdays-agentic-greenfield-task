# Vouch roadmap — July 2026 batch

> Prioritized analysis of the 13-item product batch. Criticality × speed, each
> item cross-referenced to existing specs/changes/code. Source of truth for
> *what/why* stays the PRD (`docs/cv-agent-requirements.md`); this doc sequences
> the work and points each item at its slices and requirement IDs.
>
> **Created:** 2026-07-04. Derived from a 16-agent analysis workflow
> (`wf_ba635982-08a`): 2 bug root-causers + 13 task mappers + synthesis.

## Update 2026-07-04 (batch 2 — 10-task re-scope)

User re-handed the batch as 10 tasks. A 10-agent evidence workflow (`wf_c452a9aa-e02`) re-checked each
against real code. Net: **T1, T4, T6 are DONE** since this table was written; two new deploy/DB bugs
were found and fixed. Live status now lives in `docs/current-state.md` (source of truth). Delta:

- **NEW P0 — `read ECONNRESET` on delete/export** (deeper than BUG-1/2's uncaught-500 catch): bare pg
  `Pool` with no SSL/idle-timeout/error-handler. **Fixed** `fcf39c5` (pool hardening + retry-once).
- **NEW — registration 500 on fresh deploy:** no prod migration step. **Fixed** `73dd267` (`db:migrate`).
- **T1 tailoring intelligence — DONE** (shipped + archived). **T4 header — DONE** (archive pending).
- **T6 history — DONE in code** (suite green after `7babd9d`; openspec archive + 0004 integ-test pending).
- Ordering unchanged for the rest: landing (T8+T9) → premium attach (T5) → animations (T7) → i18n (T10).

## Security callout (act first)

A live **Stripe secret key** (`sk_test_…`) was shared in plaintext during
intake. Even test-mode keys are credentials. **Rotate it** (Stripe → Developers
→ API keys → roll). It must never enter the repo — server-side env only
(`.env.local`, Vercel project secrets). Only the publishable key (`pk_test_…`)
is client-safe. This gates T13.

## Ranked backlog

Ordered by criticality first, then speed. P0 = confirmed bug/legal exposure;
P1 = high user/revenue value; P2 = polish. Effort: S ≤ 0.5d, M ~1–2d, L ~3–5d,
XL > 1wk.

| # | ID | Item | Crit | Effort | Status |
|---|-----|------|------|--------|--------|
| 1 | BUG-1 | GDPR `DELETE /api/account` uncaught 500 | P0 | S | ✅ **fixed** `c39fc9f` |
| 2 | BUG-2 | GDPR `GET /api/account/export` 500 | P0 | S | ✅ **fixed** `c39fc9f` |
| 3 | T11 | Sentry: filter PII, opt out of bodies/userInfo, env-driven | P1 | M | spec'd → `harden-sentry-privacy` |
| 4 | T4 | Header rework (signed-in name, anchor isolation, footer privacy link) | P1 | M | mapped |
| 5 | T12 | Privacy Policy + public oferta pages | P1 | M | spec'd → `add-legal-pages` |
| 6 | T1 | Tailoring intelligence (seniority, blue-info status, cover letter) | P1 | XL | spec'd → `add-tailoring-intelligence` |
| 7 | T6 | Tailoring history (list past tailorings) | P2 | M | mapped |
| 8 | T5 | Premium: attach original PDF to request | P1 | L | mapped |
| 9 | T13 | Stripe sandbox behind the port | P1 | XL | spec'd → `add-stripe-payments` |
| 10 | T7 | App-wide animation/UX (skeletons, optimistic, hover) | P2 | XL | extends `landing-animations` |
| 11 | T8 | Update landing to new tailoring flow | P1 | M | mapped — depends on T1/T5/T6 |
| 12 | T9 | Landing copy: enemy-centric marketing | P2 | M | mapped |
| 13 | T10 | App-wide UA/EN language toggle | P2 | L | mapped — font decided (see below) |

**Quick-win tier (do first):** BUG-1, BUG-2 (done), then **T11** — high value,
fast, and it is *live privacy debt*.

## Sequencing rationale

1. **P0 bugs first** (done): both GDPR endpoints threw uncaught 500s — legal +
   NFR-OBS-01 failures, sub-day each.
2. **T11 Sentry** before any real PII/paid E2E: it currently ships HTTP bodies +
   user context to a third party by default (opt-outs confirmed commented out) —
   CV/JD plaintext and user IDs can leak (NFR-SEC-01/02, BC-PRIVACY-01).
3. **P1 shell/legal cluster** — T4 (trust-in-navigation, unblocks the T12 privacy
   route) then T12 (legal gate for revenue; UA e-commerce needs a публічна оферта).
4. **Feature phase in dependency order** — T1 anchors it (defines the outputs T5/
   T6/T8 describe), then T6 and T5 build on T1's grounding model.
5. **T13 real Stripe** later: XL, and gated on the MoR decision + secrets + T12.
6. **Landing/i18n polish last** — T7/T8/T9/T10; T8 must trail its feature deps to
   stay honest, T10 is blocked on the Cyrillic font decision.

## Per-item detail

### BUG-1 / BUG-2 — GDPR endpoints 500 (✅ fixed)
Root cause: `DELETE /api/account` and `GET /api/account/export` wrapped no
try-catch around `getDb()`/`getCvEncryptionKey()`/service assembly, so any throw
(unset `CV_ENCRYPTION_KEY`, DB/FK error) surfaced as an opaque raw 500 and could
leak a stack/schema. Both now catch → calm coded 500 (`deletion_failed` /
`export_failed`), cause logged server-side only. Cascade confirmed sound (every
child FK is `ON DELETE CASCADE`). Tests added. See change `fix-gdpr-account-endpoints`.

### T11 — Sentry privacy hardening (P1, M) → `harden-sentry-privacy`
Sentry shipped (`a8b7784`) with `dataCollection.userInfo`/`httpBodies` opt-outs
**commented out**, DSN hardcoded, `tracesSampleRate: 1.0`. Default behavior sends
request bodies + user context to a third party — CV/JD plaintext + user IDs leak,
violating NFR-SEC-01/02 and BC-PRIVACY-01 (PRD forbids third-party trackers).
Fix: `beforeSend`/`beforeSendTransaction` redaction against CV/JD/user-id
fixtures (fail-open — send scrubbed, never drop, per NFR-OBS-01), explicit
`sendDefaultPii: false`, DSN + sample rates from env, production sampling < 1.0.
Missing client config (`sentry.client.config` / `instrumentation-client`) added.

### T4 — Header rework (P1, M)
`widgets/top-bar` already has TopBar + TopBarSession + AccountMenu (burger
disclosure). Gaps: (a) user name not shown in the header row (only in dropdown);
(b) no `scroll-padding-top` for the sticky `h-16` header → anchor targets hide
under it; (c) landing anchor links (`/#how`, `/#pricing`) leak into the app shell
on non-landing routes; (d) footer Privacy link is `href="#"` (dead — wire to
`/privacy` from T12). No schema/API changes. FR-SHELL-01/02, NFR-OBS-01.

### T12 — Legal pages (P1, M) → `add-legal-pages`
No legal pages exist; footer Privacy link is a dead stub. Add `views/legal`
(Privacy Policy + public oferta — the UA legal offer doc a payment flow
requires), static routes, wire footer + checkout links, add to sitemap.
BC-PRIVACY-01/02, NFR-GDPR-01/02. Needs legal-counsel sign-off on copy. Unblocks
T13. Content only, no architectural risk.

### T1 — Tailoring intelligence (P1, XL) → `add-tailoring-intelligence`
Three sub-features, all honesty-critical: (1) **seniority inference** — a pure
prompt over CV prose only (never invents absent skills), tags the tailoring;
(2) **blue "info" checklist status** — a new status between grounded and `gap`
(red) for requirements *coverable* by stronger adjacent CV evidence but not
highlighted (surfaced as "improve in a cover letter", not "missing"); (3)
**cover-letter generation** at the end of the flow — new `features/export-cover-letter`,
grounded prompt, new export route, ExportDocument extension. Grounding stays
context-isolated; inferred seniority must not become an overclaim backdoor
(BC-HONESTY-01/03). Spec fully before building. Gates T8. FR-CHECKLIST-*,
FR-BULLETS-01, FR-EXPORT-01.

### T6 — Tailoring history (P2, M)
`tailoring-repo` already has `listByUser`/`findById`. Gaps: `views/history`
slice, `job_title` column migration (extract JD title at save), two **ownership-
gated** route handlers (IDOR risk on `GET /api/tailoring/:id` — verify `user_id`),
list + re-open UI, wire the "coming soon" AccountMenu link. Paid-tier gated
(FR-HISTORY-01/02, FR-TAILOR-04).

### T5 — Premium PDF attach (P1, L)
Today parse extracts text and discards bytes. New: store the original PDF
(new `pdf_binary` column, AES-256-GCM parity with text — NFR-SEC-01; GDPR export
+ delete-cascade must include it), extend the LLM prompt/message types to
multimodal document blocks (Anthropic SDK supports `document`), gate upload UI
with a disabled + "premium" badge for free users → upgrade modal (new
`PaywallReason`). Document-sourced bullets tagged + excludable like any ungrounded
claim (FR-BULLETS-02). Depends on T1's grounding model. FR-PAYWALL-01/02.

### T13 — Stripe sandbox (P1, XL) — spec'd → `add-stripe-payments`
`shared/lib/payments` has a provider **port** + contract test + working
**emulator**; the factory has a branch point for a real adapter. **Decision
(2026-07-04): add Stripe sandbox behind the port**, MoR/VAT deferred (not a
blocker). Add the `stripe` dep + a Stripe adapter satisfying the port, select via
`PAYMENTS_PROVIDER=stripe`, real Checkout Session, signature-verified idempotent
webhook syncing `subscriptions`, cancel at period end. Security: verify webhooks
via `stripe.webhooks.constructEvent` (raw body, not custom HMAC), idempotency on
retries, secret key never in the client bundle. Rotate the exposed key first;
checkout should surface T12 legal terms.

### T7 — App-wide animations (P2, XL)
`landing-animations` change already designed (landing scroll-reveal/hero/CTA,
not yet implemented). This extends it app-wide: skeletons for the tailor-workspace
async phases, optimistic bullet edits/toggles, hover micro-interactions. All
CSS-first, `prefers-reduced-motion` gated, CLS 0. Do the landing half first;
every landing touch needs `perf-audit` (~20ms LCP margin). BC-BRAND-01 (restrained).

### T8 — Landing update to new flow (P1, M)
Rework `views/landing` + `marketing-landing` spec to describe cover letters,
blue-info, premium attach, history. **Hard dependency on T1/T5/T6 being specced**
— advertising features the product can't back is a BC-HONESTY/BC-BRAND-01 risk.
Perf-audit required.

### T9 — Landing marketing copy (P2, M)
Apply the org **enemy-centric** framing (lead with the broken status quo / the
painful résumé-lying workaround) to `content.ts` + sections. Stay inside
BC-BRAND-01 (calm, honest — no hype, or it undercuts the honesty brand). Sequence
after T8 so both passes touch `content.ts` once. Content only.

### T10 — Language toggle (P2, L) — font decision made
`shared/lib/i18n` has ua/en; no runtime i18n lib (by design). The Cyrillic-font
blocker is **resolved** (decision #4): Golos Text (body/UI) + Unbounded (display),
both Cyrillic-capable via `next/font`. Remaining work: swap the fonts (DESIGN.md
update + `perf-audit`), add a locale provider + persist choice, extract landing
strings to i18n. Still P2 (deferring is safe for MVP validation). NFR-I18N-01,
BC-BRAND-01, NFR-PERF-04.

## Cross-cutting risks

- **Honesty (BC-HONESTY-01/02/03):** T1 (seniority, cover letter) + T5 (document
  attach) widen LLM context/attack surface. Keep grounding context-isolated; run
  `honesty-eval` on every prompt change; document-sourced claims excludable by default.
- **Third-party tracker vs Sentry (BC-PRIVACY-01):** the PRD forbids third-party
  trackers; Sentry is one. T11 must opt out of userInfo/httpBodies and redact
  CV/JD/user-id, fail-open.
- **PII/PHI at rest (NFR-SEC-01/02):** T5 adds a new PDF-binary surface (encrypt,
  strip metadata, export, cascade-delete). Bug fixes must not leak schema in errors.
- **OWASP:** IDOR on T6 `GET /:id` (ownership check); T13 webhook forgery +
  idempotency; Stripe secret never client-side.
- **SOC 2 / audit:** T12 legal + T13 tax need legal/finance sign-off; MoR decision
  (TC-STACK-06) has VAT consequences engineering can't resolve alone.
- **Cyrillic font (NFR-I18N-01/NFR-OBS-02):** Latin-only display fonts shadow all
  Ukrainian UI (T8/T9/T10 + T1's cover-letter/badge strings). PDF export sidesteps
  it with a bundled font; the web UI question is open.
- **Performance (NFR-PERF-04):** landing has a ~20ms LCP margin — T7/T8/T9/T10
  (font subset) each require a `perf-audit` before merge.
- **i18n discipline:** all new UI strings centralized in `shared/lib/i18n` with
  ua/en parity (lint-enforced).

## Decisions (resolved 2026-07-04)

1. **Cover letter → in scope.** PRD now has `FR-COVERLETTER-01/02` and drops the
   out-of-scope line; `add-tailoring-intelligence` §0.1 resolved. ✅
2. **Payments provider → Stripe (sandbox).** Added behind the existing port so more
   providers come later; MoR/VAT (Paddle / Lemon Squeezy) **deferred**, not an MVP
   blocker. TC-STACK-06 updated. New change `add-stripe-payments`. T13 unblocked. ✅
3. **Stripe key → placeholder template only.** Real key rotated by user; `.env.example`
   + dev-setup use `sk_test_…`/`pk_test_…` placeholders. Never in repo. ✅
4. **Cyrillic font (my call).** Adopt a Cyrillic-first pairing for Ukrainian UI:
   **body/UI → Golos Text** (Cyrillic-first grotesque, close to Hanken), **display →
   Unbounded** (Ukrainian foundry, full Cyrillic) — keep Bricolage for Latin-only
   marketing if desired. Unblocks T10. Still needs a DESIGN.md update + a
   `perf-audit` (LCP ~20ms margin) + designer nod before shipping; both fonts load
   via `next/font`. Recorded, not yet implemented.
5. **Sentry → skip implementation for now.** Keep the spec + todos
   (`harden-sentry-privacy`); do not build this pass. Note it is live PII-leak debt,
   so build before any real paid/PII E2E. `enableLogs: true` in all three configs is
   an extra plaintext egress path — the change's redaction covers it; reconsider
   enabling it in production.
6. **Cover-letter scope depth** — recommend MVP = grounded bullets reformatted as
   prose first; a fuller role-specific letter later.

## OpenSpec changes proposed from this roadmap

- `fix-gdpr-account-endpoints` (BUG-1/2) — retroactive; captures the calm-error
  contract + the previously-unspecced `account` capability. Code already shipped.
- `harden-sentry-privacy` (T11) — spec + todos only; implementation deferred.
- `add-legal-pages` (T12)
- `add-tailoring-intelligence` (T1) — cover letter now in PRD scope.
- `add-stripe-payments` (T13) — Stripe sandbox behind the port; MoR deferred.

> Validation note: the `openspec` CLI is **not** installed in this environment
> (a prior handoff note claiming otherwise was stale). Run
> `openspec validate <change>` before implementing each.
