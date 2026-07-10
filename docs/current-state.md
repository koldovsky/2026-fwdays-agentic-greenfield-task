# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short, overwrite stale content, don't append endlessly.
> **Commits are the source of truth** (`git log`); this file is the plan + pointers.

**Updated:** 2026-07-10

## Last action (most recent first)

- **`test-tailoring-race-guard` DONE `c872595` (2026-07-10).** 3 PGlite integration cases for the
  `updateStatus` status-race guard: (a) sweep-then-complete rejected, (b) double-terminal no-op,
  (c) zero-rows child-skip. Checker mutation-tested (guard removed → all 3 fail). A future-cutoff-sweep
  flake was found + fixed (back-date own row + positive TTL). Full suite 6/6 green. FR-TAILOR-04.
- **`honest-plan-claims` DONE `d109922` (2026-07-10).** Unfounded Ultra/Pro perks (priority / high-volume)
  marked "(coming soon)"; the "flagship model" claim REMOVED entirely (Opus is already universal, so it is
  neither a current nor future Ultra differentiator — checker catch); legal.offer de-Stripe'd (emulator +
  [TODO]); privacy+offer dates → 9 July. BC-HONESTY-01, BC-BRAND-01, BC-PRIVACY-02.
- **`fix-billing-locale` DONE `70ff874` (2026-07-10).** /account/billing now reads the locale cookie
  (mirrors /account/profile) so the header UA/EN switch works. Verified no other authed page has the gap.
  NFR-I18N-01, FR-BILLING-01, FR-SHELL-01.
- **`restack-checklist-preview` DONE `62e686e` (2026-07-09).** Landing "where you stand": MatchScore card on
  top, bullets in an equal-height (`auto-rows-fr`) 2-col grid; CSS-only dividers. FR-SALES-02, FR-CHECKLIST-*.
- **`fix-faq-and-privacy-accuracy` (T2+T3) DONE `34cdd5e` (2026-07-09).** FAQ "Pro" → "any paid plan";
  free cadence "1 tailoring"; full best-effort GDPR privacy draft (JSON→PDF, [TODO] legal placeholders,
  Ultra added to offer). Completed the 8-task batch.

## Working on

**Nothing in flight.** All batches (10-task + 6-task + 8-task) complete — see `git log`.

## Next steps (code-doable, pick by value)

1. **T5 #8 — server-side export honesty gate** (defense-in-depth, higher value). The `includedInExport`
   gate is applied client-side in `buildExportDocument`; pdf/docx routes render client-authored section
   text after shape-validation only. Harden: rebuild export sections server-side from persisted kept-bullet
   texts + a server-parsed CvDocument so the honesty gate is server-enforced. Spec-first; needs a look at
   whether kept-bullet texts are persisted. BC-HONESTY-02, NFR-SEC-04.
2. **T5 #7 — per-bullet role provenance** (fidelity-only, honest today). Kept bullets attach to the
   most-recent parsed role because `Bullet` has no source-role tag. Add `Bullet.sourceRoleIndex` (model +
   migration + gen-pipeline thread) to place each kept bullet under its source role, then restore the
   stricter resume-export spec scenario. Own spec-first change.
3. **Follow-ups from recent work:** audit `checkout`/`history` pages for a missing-locale read like the
   billing bug (billing was fixed; grep showed no others, low risk); optional token-vs-session IDOR check on
   /checkout (defense-in-depth).

## Blocked (env / tooling / human — no code here)

- **perf-audit** — Lighthouse needs Chrome (unavailable). Re-run on landing (restack + Cyrillic fonts +
  dynamic route) vs NFR-PERF-04; LCP margin ~20ms.
- **openspec archives** — CLI not installed. ~8 changes to fold in dependency order (`update-landing-flow`
  → `surface-premium-attach-landing`; `harden-account-export-ux` after `fix-gdpr-account-endpoints`; etc.).
- **Prod env + migrate** — set `CV_ENCRYPTION_KEY` / `DATABASE_URL` / `AUTH_SECRET` / `ANTHROPIC_API_KEY` /
  `NEXT_PUBLIC_SITE_URL`, run `yarn db:migrate`, redeploy. GDPR export + history need this end-to-end.
- **Live honesty-eval** — needs `ANTHROPIC_API_KEY` in this env; deterministic proxies green. `COVERAGE_JUDGE`
  defaults ON (key-gated), fails-soft OFF without a key.
- **Ops cron** — `POST /api/maintenance/tailoring-cleanup` (Bearer `$MAINTENANCE_SECRET`) exists; set the
  secret in prod + schedule the periodic invoker (Vercel Cron / curl).
- **UA marketing/legal native review** — landing + privacy/plan copy is faithful but not team-reviewed;
  legal-counsel facts ship as clearly-marked `[TODO]` placeholders.

## Blockers / open questions

- None active. The items above are gated on environment/tooling/human access, not on a decision.

## Prior context (source of truth = `git log` + archived changes)

- Built: FSD foundation, two-pass honesty pipeline, auth (credentials), persistence (pg + AES-256-GCM CV
  at rest), payments emulator (Stripe hard-disabled in prod), account/GDPR APIs, top-bar + AccountMenu,
  landing, UA/EN i18n toggle (Unbounded + Golos fonts, locale cookie), tailoring history, CI +
  typecheck/lint gates, review-findings artifact convention.
- Agentic loop: `maker ≠ checker ≠ test-author` (STRICT, separate contexts); plan-first via this file
  (hook-enforced); commit-on-the-fly; model routing (low→haiku / medium→sonnet / high→opus);
  spec-driven (OpenSpec). See `AGENTS.md`.
