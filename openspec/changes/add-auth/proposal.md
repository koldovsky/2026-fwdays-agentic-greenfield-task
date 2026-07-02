## Why

Everything durable in Vouch — stored CV profiles, tailoring history, plans — is
gated on a signed-in user, but there is no auth yet (FR-AUTH-01/02/03 are all
`proposed`; `TC-STACK-07` is undecided). This change stands up authentication as
the foundation the persistence, payments, and history capabilities build on,
without blocking the one free anonymous tailoring (FR-ONBOARD-01).

## What Changes

- Add email + password sign-up / sign-in and Google OAuth via an Auth.js-style
  session, running inside the Next.js app as route handlers + server actions (no
  separate service). Resolves the `TC-STACK-07` decision toward Auth.js.
- Add a password-reset flow via emailed link.
- Introduce a `session` capability: server helpers to read the current user in
  route handlers, server actions, and views; anonymous state stays first-class so
  a signed-out visitor keeps one free tailoring.
- Add `features/sign-in` (form + Google button) and account/session UI hooks in
  the top bar; sign-in is only *required* at the paywall/export boundary.
- CV and user data handling follows privacy rules: user IDs excluded from LLM
  payloads (NFR-SEC-02); no trackers (BC-PRIVACY-01).

## Capabilities

### New Capabilities
- `auth`: sign-up, sign-in (email+password and Google OAuth), password reset, and
  sign-out. Serves FR-AUTH-01/02/03, TC-STACK-07.
- `session`: server-side current-user resolution and the anonymous-vs-authenticated
  boundary that gates persistence and export. Serves FR-ONBOARD-01, NFR-SEC-02.

### Modified Capabilities
<!-- None yet. `app-shell` already permits one anonymous tailoring; this adds the auth surface it defers to. -->

## Impact

- New: `src/features/sign-in/**`, `src/entities/user/**` (auth-facing model),
  `shared/lib/auth` session helpers, route handlers under `src/app/api/auth/**`.
- Depends on: an Auth.js-compatible library + a users table (see `add-persistence`),
  an email sender for reset links, Google OAuth credentials (env).
- Serves: FR-AUTH-01/02/03, TC-STACK-07, FR-ONBOARD-01, NFR-SEC-02, BC-PRIVACY-01.
- Blocked-by: `add-persistence` (users/session storage) — can develop against a
  stub adapter first.
