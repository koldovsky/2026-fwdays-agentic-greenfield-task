## 1. Failing tests first (red)

- [x] 1.1 Write unit tests for the theme-persistence helper: stored value is read on load, default (`light`) applies when the key is absent, and an unreadable/corrupt `localStorage` value falls back to the default without throwing (FR-SHELL-02). Confirm they FAIL.
- [x] 1.2 Write unit tests for the shared action-result contract `lib/forms/result.ts`: `ok()` returns `{ ok: true }` (with optional `data`), `fieldError()` returns `{ ok: false, fieldErrors }`, `formError()` returns `{ ok: false, formError }`, and the union narrows correctly (FR-SHELL-03). Confirm they FAIL.
- [x] 1.3 Write a unit test for the `<FieldError>` convention: renders nothing when message is empty; when present renders `role="alert"` with id `{fieldId}-error` carrying the message (FR-SHELL-03, NFR-A11Y-04). Confirm it FAILS.
- [x] 1.4 Write a smoke test that the shell renders the app title + nav links to `/` and `/plants/[id]` in BOTH light and dark theme states, and that the initial document root reflects the stored dark theme before paint (FR-SHELL-01, FR-SHELL-02). Confirm it FAILS.
- [x] 1.5 Write a test that an unknown `/plants/[id]` route renders the friendly not-found state with a link back to `/`, never a raw 500 (FR-SHELL-01). Confirm it FAILS. (`app/not-found.test.tsx`: global boundary renders generic copy, plant boundary renders plant copy, both link back to `/`.)

## 2. Implement to green

- [x] 2.1 Create the Ukrainian copy module `lib/i18n/uk.ts` (app title, nav labels, theme-toggle accessible name, not-found copy, generic error messages) — Ukrainian text, English identifiers (NFR-LOC-01).
- [x] 2.2 Implement the shared action-result contract `lib/forms/result.ts`: `ActionResult<T>` discriminated union plus `ok`, `fieldError`, `formError` helpers per design D3 (FR-SHELL-03). Green for 1.2.
- [x] 2.3 Implement the theme-persistence helper (read/write `pgwt.theme`, default + try/catch fallback) per design D2 (FR-SHELL-02). Green for 1.1.
- [x] 2.4 Implement the root layout `app/layout.tsx`: `<html lang="uk">`, the pre-hydration no-flash inline `<head>` script that sets the `dark` class from `localStorage` before paint, and the shell wrapper + `ThemeProvider` (FR-SHELL-01, FR-SHELL-02).
- [x] 2.5 Implement the shared shell: header with app title, nav `<Link>`s for plant list `/` and plant detail `/plants/[id]`, responsive ≥ 360 px, keyboard-operable with accessible labels (FR-SHELL-01, NFR-USA-01, NFR-COMPAT-01, NFR-A11Y-04).
- [x] 2.6 Implement `ThemeProvider` (client context) + `ThemeToggle` (client button with accessible Ukrainian label) wired to the persistence helper (FR-SHELL-02). Green for 1.4.
- [x] 2.7 Configure Tailwind 4 dark-mode (class strategy on `<html>`) and define light + dark theme tokens that meet AA contrast (NFR-A11Y-02).
- [x] 2.8 Implement `components/forms/FieldError.tsx` (id `{fieldId}-error`, `role="alert"`, AT association via `aria-describedby`/`aria-invalid` convention) per design D4 (FR-SHELL-03, NFR-A11Y-04). Green for 1.3.
- [x] 2.9 Implement `components/forms/FormErrorBanner.tsx` (top-of-form `role="alert"` banner fed by `result.formError`) per design D4 (FR-SHELL-03).
- [x] 2.10 Implement the `/plants/[id]` not-found boundary + `app/not-found.tsx` with Ukrainian copy and a link back to `/` (FR-SHELL-01). Green for 1.5.
- [x] 2.11 Confirm all tests from group 1 now pass (green).

## 3. Accessibility

> DEFERRED to Phase 6 (cross-cutting QA: axe light+dark + vision-verify across
> ALL capabilities). The rendered-result a11y gates below run once, against the
> whole app, in Phase 6 rather than per-slice — so the shipped state here is
> honestly "deferred", not silently skipped. The jsdom-level a11y already covered
> by this slice (accessible labels on nav/toggle + keyboard reachability) is
> tested in `components/shell/Shell.test.tsx`.

- [ ] 3.1 (Deferred → Phase 6) Run `npm run check:a11y` (axe) on the shell in BOTH light and dark themes; resolve any violations (NFR-A11Y-01).
- [ ] 3.2 (Deferred → Phase 6) Verify WCAG 2.1 AA contrast for text and interactive elements in both themes (NFR-A11Y-02).
- [ ] 3.3 (Deferred → Phase 6) Verify keyboard-only operation: visible focus, accessible names on nav links and theme toggle, Enter/Space activation, and that `<FieldError>` messages are programmatically associated with their fields (NFR-A11Y-04). (jsdom labels + keyboard reachability already in `Shell.test.tsx`.)
- [ ] 3.4 (Deferred → Phase 6) Verify the shell at a 360 px viewport: nav and content visible/operable with no horizontal overflow (NFR-COMPAT-01).

## 4. Validation and archive

- [x] 4.1 Run `npm run lint` — zero errors.
- [x] 4.2 Run `npm run test:run` — all unit tests pass.
- [x] 4.3 Run `npm run build` — production build succeeds.
- [x] 4.4 Run `npx openspec validate add-app-shell --strict` — no errors.
- [x] 4.5 Run `npx openspec validate --all --strict` — no errors.
- [ ] 4.6 Manual smoke test: `npm run dev`; open `/`, confirm the shell title + nav render in Ukrainian; toggle to dark theme; reload and confirm dark theme is applied with NO flash of light; navigate to a `/plants/[id]` known route and back to `/`; open an unknown `/plants/<bad-id>` and confirm the friendly not-found state with a back link (FR-SHELL-01/02/03).
- [ ] 4.7 Update `docs/current-state.md` (date/time in Europe/Kiev, current phase, app-shell moved planned → implemented) and the README shell/theme notes.
- [ ] 4.8 Only after the smoke test (4.6) passes, archive: `npx openspec archive add-app-shell --yes`.
