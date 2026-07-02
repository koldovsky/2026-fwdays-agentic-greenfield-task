# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-02

## Last action

- **Sign-in UI + top-bar session state done, checker-reviewed, live-verified (2026-07-02).**
  add-auth 3.1 done, 3.3 partial (anonymous side). New slices, all gates green
  (lint, build, **163 tests**), uncommitted:
  - `features/sign-in`: `SignInForm` (client; sign-in/sign-up modes, credentials via
    `next-auth/react`, register via `/api/auth/register`, pure error-map in `lib/errors.ts` —
    uniform `invalid_credentials`, no enumeration) + `SignOutButton`. Google button lands with
    2.2 (needs creds).
  - `widgets/top-bar`: logo + nav (`/#how`, `/#pricing`) + session slot (anon → sign-in/try-free;
    signed-in → name/email + sign-out). Session arrives as prop from the route (FR-SHELL-01).
  - `views/auth` + `/sign-in` route (noindex, uk title, signed-in → redirect `/tailor`);
    `/tailor` now renders TopBar fed from `auth()` but is **NOT gated** (FR-ONBOARD-01);
    landing Header sign-in href → `/sign-in` (attribute-only; `/` still prerendered static, so
    NFR-PERF-04 untouched — perf-audit skipped on that rationale). `shared/ui` Button gained
    `type="submit"`; i18n gained `auth` + `topBar` sections (uk/en parity tested).
  - **Live HTTP transcript** (pglite :5544 + `next start` :3100): /sign-in 200 anon (uk form) →
    /tailor 200 anon (no gate, anon CTAs) → register 201 → credentials callback 302 + session
    cookie → /tailor shows "Olena" + Вийти, no sign-in CTA → /sign-in while authed 307 → /tailor
    → wrong-password vs unknown-email: byte-identical 302 `error=CredentialsSignin`, no cookie.
  - Checker subagent findings fixed: `role="group"` on account area (aria-prohibited-attr,
    NFR-A11Y-01), i18n'd home-link label + /sign-in metadata title, post-register sign-in
    failure now lands in sign-in mode with uniform error. Tracked, not fixed: landing `Header`
    vs `top-bar` duplication — fold once the Cyrillic display-font blocker resolves.

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

- **`add-auth` remainder** — Google OAuth (needs creds), reset email (needs sender),
  agent-verify sweep (4.1) + final checker-review (4.3; 3.1 diff already checker-reviewed).
  `add-persistence` fully done except checker-review (4.3).

## Next steps

1. **Commit the sign-in UI work** (uncommitted on `rromanko`).
2. **`add-agent-loop`** — replaces the `/tailor` stub. Needs `ANTHROPIC_API_KEY`; reuses
   `shared/lib/llm`; keep user ids out of LLM payloads (NFR-SEC-02).
3. **`add-payments-emulator`** — needs persistence + auth; export/paywall gate closes
   add-auth 3.3 when an export surface exists (with `export-resume`).
4. **`landing-animations`** — implement only after the main-flow items above.

Also open: `export-resume`, `edit-bullet`, `upload-cv`/`paste-jd` (TC-PARSE-01/02).

## Blockers / open questions

- **Ukrainian-first vs display font** — Bricolage Grotesque has no Cyrillic subset; landing
  shipped English. Resolve before i18n (NFR-I18N-01 / BC-BRAND-01 tension).
- **Env before launch:** `NEXT_PUBLIC_SITE_URL` (SEO defaults to `https://vouch.app`),
  `DATABASE_URL`, `CV_ENCRYPTION_KEY` (64 hex or base64 → 32 bytes), `AUTH_SECRET` (32+ bytes).
- Google OAuth needs client id/secret; password reset needs an email sender (Auth.js/session
  decided — see `add-auth/design.md`). Merchant-of-record (`TC-STACK-06`) undecided.
- `add-agent-loop` needs LLM SDK choice + `ANTHROPIC_API_KEY`; BullMQ/Redis not stood up.
- Agent-env: deny-list, subagents, FSD lint, `perf-audit` all done 2026-07-02. Remaining gap:
  no auto-format hook (repo has no prettier config — adding one is a human call).
