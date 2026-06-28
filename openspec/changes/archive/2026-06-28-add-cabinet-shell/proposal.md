## Why

Auth (slice 1's first half) ships sign-in, the session token mechanism, and the route guard,
but the protected area still renders the default Next.js boilerplate. This change is the
**layout half of slice 1 (`shell`)** in `docs/mvp-capability-plan.md`: it delivers the two
top-level layouts every later capability renders inside — the authenticated HR workspace
(sidebar + sticky page header) and the separate, sidebar-free respondent shell at
`/respond/[token]` — plus the cross-cutting empty/loading/error-state contract that every list
and detail screen must honour (FR-SHELL-01, FR-SHELL-02, FR-SHELL-03).

The baseline spec already exists at `openspec/specs/cabinet-shell/spec.md` (authored in Phase 2);
this change implements it. cabinet-shell owns only the surrounding chrome and the
empty/loading/error contract — the concrete content of `/cycles`, `/employees`, the form, and
the interview is owned by their own later slices. It builds inside the already-protected area
from the auth slice and reuses `lib/i18n`, the session/cookie helpers, and the design tokens.

## What Changes

- Add a **cabinet route group** `app/(cabinet)/` with a shared `layout.tsx` that renders the HR
  workspace shell: a fixed 220px left sidebar (the `Kolo360` wordmark, primary nav to `Cycles`
  and `Employees`, and the signed-in HR user with a sign-out control at the bottom) and a content
  area with a sticky page header (screen title left, a single right-aligned primary action slot).
- Add reusable shell chrome components under `components/shell/`: `Sidebar`, `NavItem` (active by
  `aria-current`, not colour alone), `PageHeader` (sticky, optional action slot), and the
  `Kolo360` wordmark.
- Add the shared **state components** under `components/states/`: `EmptyState`, `LoadingState`,
  `ErrorState` — the canonical home of the FR-SHELL-03 contract, reused by every later list/detail
  screen and already referenced by the auth sign-in screen.
- Add the **respondent shell**: `app/respond/[token]/layout.tsx` — no sidebar, no cabinet nav, a
  single centered column capped at 640px, mobile-first; header shows only the assessment context.
- Add framework-free pure logic `lib/nav/cabinet-nav.ts`: the nav destination config and
  `isActiveNavItem(pathname, href)` (exact + nested-route matching), unit-tested (TC-PURE-01).
- Add a server-only `app/(cabinet)/current-user.ts` (co-located with the cabinet group, not in
  `lib/`, so `lib/` stays framework-free): read the access-token cookie, verify it, and load
  the `HrUser` (id, name, email) via `lib/db` for the sidebar — never shipped to the client.
- Add the FR-SHELL-03 mid-session 401/403 hand-off, split to keep `lib/` DOM-free: pure
  `lib/http/auth-redirect.ts` (`shouldRedirectToSignIn`, `signInRedirectPath`) + a client
  `fetchOrRedirect` (DOM glue in `app/(cabinet)/auth-redirect.ts`) that, on a 401/403, redirects to
  `/sign-in?next=<current>` instead of the in-screen error state.
- Replace the boilerplate `app/page.tsx` with a redirect to `/cycles`; add minimal placeholder
  `app/(cabinet)/cycles/` and `app/(cabinet)/employees/` pages demonstrating the empty state so the
  shell and nav are real (their real content lands in the cycles/directory slices).
- Extend `lib/i18n/uk.ts` + `en.ts` with the `shell` namespace (nav labels, user/sign-out,
  state copy) — sentence case, no exclamation marks, no emoji (NFR-I18N-01, BC-BRAND-01).

## Impact

- Affected specs: `cabinet-shell` (implements the existing baseline; no spec change).
- Affected code: `app/(cabinet)/**` (including the server-only `current-user.ts`),
  `app/respond/[token]/layout.tsx`, `app/page.tsx`, `components/shell/**`, `components/states/**`,
  `lib/nav/**`, `lib/http/**`, `lib/i18n/{uk,en}.ts`.
- No schema change, no new dependency (Lucide icons: add `lucide-react`).
- Travelling standards: NFR-A11Y-01/02 (2px focus ring, accessible names, AA contrast, status not
  by colour alone), NFR-I18N-01, BC-BRAND-01, light theme only.
