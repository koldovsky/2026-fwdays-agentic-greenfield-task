# Design — add-cabinet-shell

Implements `openspec/specs/cabinet-shell/spec.md`. Layout chrome only; screen content is owned by
later capability slices.

## Routing & layout topology

- **Cabinet route group** `app/(cabinet)/layout.tsx` — a Server Component rendering the HR shell.
  Using a route group (parenthesised, no URL segment) means `/cycles` and `/employees` live at the
  top level while sharing one shell, and the respondent routes stay outside it. The group is inside
  the proxy's guarded set (the matcher only excludes `/sign-in`, `/api/auth`, `/respond`, static),
  so every cabinet screen is already authenticated when the layout renders.
- **Respondent shell** `app/respond/[token]/layout.tsx` — separate Server Component, no sidebar,
  `max-width: var(--content-narrow)` (640px) centered column, mobile-first. `/respond/*` is excluded
  from the proxy guard (token auth is owned by the link/respond slices, not cabinet-shell).
- `app/page.tsx` → `redirect("/cycles")` (the cabinet home). Removes the Next boilerplate.

## Components

- `components/shell/Sidebar.tsx` — fixed 220px (`--sidebar-width`), surface background, hairline
  right border. Top: `Wordmark`. Middle: `<nav aria-label>` with `NavItem`s. Bottom: signed-in user
  (name + email in mono, truncated) and a sign-out button posting to `/api/auth/sign-out`.
- `components/shell/NavItem.tsx` — client component (needs `usePathname`). Renders a link with a
  Lucide outline icon + label; active state from `isActiveNavItem(pathname, href)` set via
  `aria-current="page"` AND a left accent indicator + medium weight (never colour alone). 2px accent
  focus ring.
- `components/shell/PageHeader.tsx` — `position: sticky; top: 0`; title (`<h1>`, truncates) left,
  `children` action slot right-aligned. When no action is passed the slot collapses (no empty box).
- `components/shell/Wordmark.tsx` — `Kolo360` in Inter 600, links to `/cycles`.
- `components/states/{EmptyState,LoadingState,ErrorState}.tsx` — presentational. `EmptyState`: icon +
  message + optional action. `LoadingState`: labelled skeleton/spinner with `aria-busy`/accessible
  name. `ErrorState`: human-readable message + retry button (`onClick`/`onRetry`). All strings via
  i18n props; status conveyed with text labels.

## Pure logic (lib/, unit-tested — tests-first)

`lib/nav/cabinet-nav.ts`:
- `CABINET_NAV` — ordered list `[{ key, href }]` for Cycles, Employees (labels resolved from
  i18n at render; the key→icon map lives in `components/shell/nav-icons.ts` so `lib/` stays
  React-free).
- `isActiveNavItem(pathname, href)` — `pathname === href || pathname.startsWith(href + "/")`; `/`
  never matches a non-root href. Pure, no `next/*`. This is the slice's red-first unit target.

## Server auth read

`app/(cabinet)/current-user.ts` (server-only, uses `lib/db` + `lib/auth/tokens`): `getCurrentHrUser()` —
read `ACCESS_COOKIE` via `next/headers` cookies, `verifyAccessToken`, load `HrUser` by `sub`
(select id/name/email only). Returns `null` if absent/invalid (the layout then renders nothing
sensitive — the proxy guarantees auth, this is a defensive read for display). Never imported client-side.
It is co-located with the cabinet route group rather than in `lib/` because it imports `next/headers`,
which keeps `lib/` framework-free per AGENTS.md; the read is also wrapped in try/catch so a DB/env
fault degrades to "no user shown" rather than a raw 500.

## Mid-session 401/403 hand-off (FR-SHELL-03)

Split so `lib/` stays DOM-free: `lib/http/auth-redirect.ts` (pure, unit-tested) holds
`shouldRedirectToSignIn(status)` (true for 401/403) and `signInRedirectPath(current)` (returns
`/sign-in?next=<encoded>`); `app/(cabinet)/auth-redirect.ts` (client) is the thin DOM glue
(`fetchOrRedirect`, `AuthRedirectError`, `window.location` read/assign) built on those helpers. On a
401/403 it redirects to sign-in; all other failures (network, 5xx, malformed) flow to `ErrorState`
with retry. The placeholder pages render statically, so the live use lands when cycles/employees
fetch data.

## Accessibility & brand (travelling)

Focus ring: a shared `.focus-ring` utility (2px `--focus-ring`, offset) applied to every interactive
element. AA contrast from tokens. Active nav uses `aria-current` + weight/indicator. All copy from
`lib/i18n/uk.ts`, sentence case, no exclamation marks, no emoji; icons Lucide outline only. Long
titles/names truncate with ellipsis within container bounds; no horizontal scroll.

## Out of scope (deferred to owning slices)

Real `/cycles` and `/employees` content (cycles/directory slices); the Templates nav entry;
respondent screen content (respond/form/ai-interview); dark mode; a runtime i18n library.
