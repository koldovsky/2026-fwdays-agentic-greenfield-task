## 1. Pure nav logic + tests-first (TC-PURE-01, red before green)

- [x] 1.1 Write `lib/nav/cabinet-nav.test.ts` FIRST (red): `isActiveNavItem` is true for an exact
  match and for a nested route (`/cycles/123` under `/cycles`), false for an unrelated path, and
  `/` never matches a non-root href; `CABINET_NAV` lists Cycles then Employees with stable keys and
  hrefs. Annotate `@trace FR-SHELL-01`. (TC-PURE-01)
- [x] 1.2 Implement `lib/nav/cabinet-nav.ts` (`CABINET_NAV`, `isActiveNavItem`) — pure, no `next/*`,
  no `react`, no DOM — to turn the tests green. (FR-SHELL-01, TC-PURE-01)

## 2. i18n strings (NFR-I18N-01, BC-BRAND-01)

- [x] 2.1 Extend `lib/i18n/uk.ts` (and mirror in `en.ts`) with a `shell` namespace: nav labels
  (`cycles`, `employees`), `signOut`, `signedInAs`, and `states` copy (`loading`, `emptyTitle`/
  `emptyBody` defaults, `errorTitle`/`errorBody`, `retry`). Sentence case, no exclamation marks,
  no emoji. Keep `Messages` type in sync (uk is canonical). (NFR-I18N-01, BC-BRAND-01)

## 3. Shell chrome components (FR-SHELL-01)

- [x] 3.1 Add `components/shell/Wordmark.tsx` — `Kolo360` (Inter 600), links to `/cycles`, accessible
  name, focus ring.
- [x] 3.2 Add `components/shell/NavItem.tsx` (client; `usePathname`) — Lucide outline icon + label,
  active via `isActiveNavItem` set as `aria-current="page"` plus a non-colour cue (left indicator +
  medium weight), 2px accent focus ring, accessible name. (FR-SHELL-01, NFR-A11Y-01/02)
- [x] 3.3 Add `components/shell/Sidebar.tsx` — fixed 220px, wordmark top, `<nav aria-label>` with the
  `CABINET_NAV` items (labels from i18n), signed-in user (name + muted mono email, truncated) and a
  sign-out button (POST `/api/auth/sign-out`) at the bottom. (FR-SHELL-01)
- [x] 3.4 Add `components/shell/PageHeader.tsx` — sticky top, `<h1>` title (truncates) left, optional
  right-aligned action slot that collapses cleanly when no action is given. (FR-SHELL-01)

## 4. State components — FR-SHELL-03 canonical contract

- [x] 4.1 Add `components/states/LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx` — text from
  i18n props, `aria-busy`/accessible names, AA contrast, status by text label (never colour alone);
  `EmptyState` takes an optional primary action, `ErrorState` takes `onRetry` and shows a retry
  affordance, never a raw error/stack/500. (FR-SHELL-03, NFR-A11Y-01/02, BC-BRAND-01)
- [x] 4.2 Add the FR-SHELL-03 mid-session 401/403 hand-off, split to keep `lib/` DOM-free: pure
  `lib/http/auth-redirect.ts` (`shouldRedirectToSignIn`, `signInRedirectPath`; unit-tested with
  `@trace FR-SHELL-03`) + the client DOM glue `app/(cabinet)/auth-redirect.ts` (`fetchOrRedirect`)
  that redirects a 401/403 to `/sign-in?next=<current>` and lets all other failures flow to
  `ErrorState`. (FR-SHELL-03)

## 5. Server auth read (NFR-SEC-02)

- [x] 5.1 Add `app/(cabinet)/current-user.ts` (server-only, co-located with the cabinet group rather
  than in `lib/` so `lib/` stays framework-free) — `getCurrentHrUser()` reads the access cookie
  via `next/headers`, verifies it, loads `HrUser` (id/name/email only) via `lib/db`; returns `null`
  when absent/invalid (wrapped in try/catch so a DB/env fault degrades to no-user, not a 500). Never
  imported by a client component. (NFR-SEC-02)

## 6. Layouts & routes (FR-SHELL-01, FR-SHELL-02)

- [x] 6.1 Add `app/(cabinet)/layout.tsx` (Server Component) — render `Sidebar` (passing the current
  user) + a content area; provide the sticky `PageHeader` slot pattern. (FR-SHELL-01)
- [x] 6.2 Replace `app/page.tsx` with `redirect("/cycles")`; remove the Next boilerplate and its
  dark-mode markup. (FR-SHELL-01)
- [x] 6.3 Add placeholder `app/(cabinet)/cycles/page.tsx` and `app/(cabinet)/employees/page.tsx`,
  each rendering its `PageHeader` (title + the primary-action slot pattern) and an `EmptyState`, so
  the shell, nav active-state, and empty-state contract are demonstrable. Real content is deferred to
  the cycles/directory slices. (FR-SHELL-01, FR-SHELL-03)
- [x] 6.4 Add `app/respond/[token]/layout.tsx` — no sidebar/nav, single centered column capped at
  640px (`--content-narrow`), mobile-first; header carries only assessment context (placeholder for
  now). No path into cabinet screens. (FR-SHELL-02)

## 7. Styling & deps

- [x] 7.1 Add `lucide-react` (outline icons, `currentColor`, ~1.8px stroke). No other dependency.
- [x] 7.2 Add a shared `.focus-ring` utility (2px `--focus-ring`) in `app/globals.css`; apply to all
  interactive shell elements. Honour `prefers-reduced-motion`. Light theme only. (NFR-A11Y-01)

## 8. Verify (maker ≠ checker)

- [x] 8.1 `npm run lint && npx tsc --noEmit && npm test && npm run build` all green; no `any`, no
  casts, no `@ts-ignore`; console silent. (NFR-DX-01, NFR-OBS-01, TC-TS-01)
- [ ] 8.2 Manual check: signed-in, `/` redirects to `/cycles`; sidebar shows wordmark, Cycles +
  Employees nav (active item marked without colour), and the signed-in user; long title/name/label
  stay contained with no horizontal scroll; `/respond/<x>` renders the sidebar-free ≤640px column.
  (FR-SHELL-01..03)
- [ ] 8.3 Independent review pass (review-gate, separate agents) verifies the slice against
  FR-SHELL-01..03 and the typing/validation/a11y rules before archive. (maker ≠ checker)
