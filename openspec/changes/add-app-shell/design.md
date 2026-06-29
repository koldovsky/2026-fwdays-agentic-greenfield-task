## Context

First build slice. Stack is fixed by ADR-0001: Next.js 16 (App Router) +
TypeScript + Tailwind 4, SQLite + Drizzle, Recharts, Vitest, Playwright. UI copy
is Ukrainian (NFR-LOC-01); code identifiers, spec text, and trace ids stay
English. The app is single-user and auth-less (NFR-SEC-01, TC-04), so "shell"
here means a navigational/visual frame, not an authenticated session shell.

Three behaviors must land together because they are mutually entangled: the
shell frame (FR-SHELL-01), the persisted theme it renders in (FR-SHELL-02), and
the inline-error contract its forms obey (FR-SHELL-03). The error contract in
particular is a SHARED API consumed by slices 2–5 (plants, growth, watering,
charts), so its exact shape is specified here and treated as frozen.

## Goals / Non-Goals

**Goals:**
- One root layout + one shared shell; navigation list `/` ↔ detail
  `/plants/[id]` (FR-SHELL-01), core flows reachable in ≤ 2 clicks (NFR-USA-01).
- Light/dark theme toggle persisted across reloads/restarts with NO flash of the
  wrong theme on load (FR-SHELL-02).
- A precise, reusable inline-error contract: server-action result discriminated
  union + `<FieldError>` + form-error banner (FR-SHELL-03), in Ukrainian
  (NFR-LOC-01), programmatically associated for AT (NFR-A11Y-04).
- Accessible (axe-clean, AA contrast) in BOTH themes (NFR-A11Y-01/02);
  responsive ≥ 360 px (NFR-COMPAT-01) on evergreen browsers (NFR-COMPAT-02).

**Non-Goals:**
- No plant/growth/watering/chart data, schema, or queries — those are slices
  2–5. This slice may render placeholder list/detail content only.
- No auth, accounts, or sessions (NFR-SEC-01, FR-SHELL-05 is Future).
- No data export/import (FR-SHELL-04 is Future).
- No extra top-level navigation beyond list and detail.
- No i18n switching UI (NFR-LOC-02 is Future) — Ukrainian is hard-coded.

## Decisions

### D1 — Single root layout + shared shell server component
`app/layout.tsx` is the only root layout; it sets `<html lang="uk">`, renders
`<head>` with the pre-hydration theme script, wraps children in the shell
(header with app title + nav links + theme toggle) and `ThemeProvider`. The
shell itself is a server component; only the toggle is a client island.
Navigation uses Next `<Link>` to `/` and `/plants/[id]`. Trade-off: keeping the
shell server-side avoids shipping nav as client JS, at the cost of the toggle
being a separate client boundary — accepted (smaller bundle, FR-SHELL-01 needs
no client state).

### D2 — Theme persistence + no-flash pre-hydration script  (ADR-worthy)
Theme = `'light' | 'dark'`, persisted under `localStorage` key
`pgwt.theme`. Applied by setting `class="dark"` (or its absence) on
`<html>`, matching Tailwind 4's `dark:` variant configured for class strategy.

To avoid a flash of the wrong theme, a tiny synchronous inline `<script>` runs in
`<head>` BEFORE hydration: it reads `localStorage['pgwt.theme']`, falls back to
the default (`light`) if absent/unreadable, and sets the `dark` class on
`document.documentElement` synchronously. React then hydrates a `ThemeProvider`
(client) that reads the same value into state and exposes `theme` + `toggle()`.
`toggle()` writes `localStorage` and updates the `<html>` class.

This is ADR-worthy: an inline blocking script in `<head>` is a deliberate
deviation from "no inline scripts" hygiene and has CSP implications. Trade-off:
the alternative (render light, swap after hydration) violates FR-SHELL-02's
"applied before first paint" scenario — the inline script is the standard,
accepted way to satisfy it. The script is small, static, and self-contained.

`localStorage` read is wrapped in try/catch so a disabled/unreadable store
falls back to the default theme without throwing (covers the corrupt-value
scenario).

### D3 — Shared server-action result contract  (frozen — slices 2–5 depend on it)
`lib/forms/result.ts` exports the discriminated union every server action that
backs a form returns:

```ts
export type FieldErrors = Record<string, string>; // field name -> Ukrainian message

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; fieldErrors?: FieldErrors; formError?: string };

export const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data });
export const fieldError = (fieldErrors: FieldErrors): ActionResult<never> =>
  ({ ok: false, fieldErrors });
export const formError = (message: string): ActionResult<never> =>
  ({ ok: false, formError: message });
```

Rules (also enforced by AGENTS.md correctness rules): a form-backing action
NEVER throws on user input — it catches, translates (FK/unique/validation/driver
errors → human Ukrainian message), and returns `{ ok: false, ... }`.
`fieldErrors` keys are field names so the form can place each message inline;
`formError` is for whole-form failures (e.g. a translated DB constraint). The
generic `data` carries success payloads later slices need. Trade-off vs.
throwing + error boundary: returning a value keeps the failure on the same
screen with the user's input intact and avoids a route-level error page —
required by FR-SHELL-03 ("never a raw 500 or silent failure").

### D4 — `<FieldError>` + form-error banner components  (shared UI)
`components/forms/FieldError.tsx` (client): given a field id and an optional
message, renders nothing when message is empty; when present, renders a
`<p id="{fieldId}-error" role="alert">` with the Ukrainian message. The owning
input sets `aria-invalid="true"` and `aria-describedby="{fieldId}-error"` so the
error is programmatically associated (NFR-A11Y-04). Convention: every form field
gets a stable `id`; its error element is `{id}-error`.

`components/forms/FormErrorBanner.tsx` (client): given an optional `formError`
string, renders nothing when empty; when present, renders a
`role="alert"` banner at the top of the form with the Ukrainian message. This is
the visible target for `?formError=` / `{ formError }` results.

Both consume the `ActionResult` from D3: a wrapper (e.g. `useActionState` or a
small form hook, decided at implementation) maps `result.fieldErrors[name]` into
each `<FieldError>` and `result.formError` into the banner.

### D5 — Unknown plant route → friendly not-found
`/plants/[id]` for a non-existent id renders Next's not-found state
(`notFound()` → `app/plants/[id]/not-found.tsx` or `app/not-found.tsx`) with a
Ukrainian message and a `<Link>` back to `/` — never a raw 500 or blank screen.
In this slice the id is not validated against a DB (no DB yet); the boundary and
its copy are wired so slice 2 calls `notFound()` when a lookup misses.

### D6 — Ukrainian copy module
All shell strings (app title, nav labels — "Рослини" / back to list, theme
toggle accessible name, not-found copy, and the generic error messages) live in
`lib/i18n/uk.ts` as named constants, not inline literals, so later slices reuse
the same source and copy stays consistent (NFR-LOC-01).

### SSR / client boundaries
- Server: `app/layout.tsx`, shell header + nav, not-found boundaries, page
  shells. No client JS for navigation.
- Inline (pre-React, in `<head>`): the no-flash theme script.
- Client islands: `ThemeProvider` (context + `localStorage` writes), the theme
  `ThemeToggle` button, `FieldError`, `FormErrorBanner`, and any form using the
  action-result wrapper.

## Risks / Trade-offs

- **Theme flash regression (R1).** If the inline script is removed or the
  Tailwind dark strategy drifts from the `dark` class on `<html>`, the no-flash
  guarantee breaks silently. Mitigation: the spec's "applied before first paint"
  scenario is an executable test (assert the document's initial rendered root is
  dark when the stored value is dark), so a regression fails CI.
- **Frozen contract churn (R2).** Slices 2–5 hard-depend on the `ActionResult`
  shape and the `FieldError`/banner API; a later reshape is a breaking change.
  Mitigation: ship it with unit tests pinning the helpers (`ok`/`fieldError`/
  `formError`) and the field-id ↔ `{id}-error` association convention; treat
  changes as a new OpenSpec change, not an edit.
- **CSP vs. inline script (R3).** The pre-hydration inline script needs a CSP
  allowance (nonce/hash) if a strict CSP is added later. Mitigation: documented
  here as the ADR-worthy deviation (D2); revisit when/if CSP is introduced
  (out of MVP scope).
- **`localStorage` unavailable (R4).** Private mode / disabled storage. Mitigated
  by the try/catch fallback to the default theme (D2) — covered by the
  missing/corrupt-value scenario.
- **Contrast drift between themes (R5).** Dark tokens can fall below AA.
  Mitigation: axe + contrast checks gated in BOTH themes (NFR-A11Y-01/02) in the
  a11y task group.

## Known advisories

- **PostCSS `<8.5.10` — GHSA-qx2v-qp2m-jg93 (moderate, accepted/transitive).**
  `npm audit` flags PostCSS 8.4.31 with an XSS-via-unescaped-`</style>`-in-CSS-
  stringify advisory. It is **transitive**: pulled in only through the nested
  `node_modules/next/node_modules/postcss` of the pinned `next@16.2.9`; our own
  top-level PostCSS (`@tailwindcss/postcss`) already resolves to a patched
  8.5.x. No non-breaking fix exists — `npm audit fix` resolves nothing and the
  only `--force` path is a major downgrade to `next@9.3.3`, which we do NOT
  apply. Exploitability here is low: this app processes only first-party
  Tailwind/CSS at build time; no user-supplied stylesheet reaches PostCSS's
  stringifier. **Action:** accepted as a transitive advisory; revisit and bump
  when a Next.js patch release depends on PostCSS `>=8.5.10`.
