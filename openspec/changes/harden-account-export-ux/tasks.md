# Tasks — harden-account-export-ux

## 1. i18n strings

- [x] 1.1 Add `exportPending: string` and `exportError: string` to the `profile`
  section of `src/shared/lib/i18n/types.ts` (after `exportAction`, before
  `deleteAction`). Cite NFR-OBS-01 in the comment.
- [x] 1.2 Add the Ukrainian values to `src/shared/lib/i18n/ua.ts`:
  `exportPending` (e.g. "Завантаження...") and `exportError` (calm, e.g.
  "Не вдалося завантажити дані. Спробуйте ще раз.").
- [x] 1.3 Add the English values to `src/shared/lib/i18n/en.ts`:
  `exportPending` (e.g. "Downloading...") and `exportError` (e.g.
  "Could not download your data. Please try again.").

## 2. Per-profile decrypt guard (service + repo)

- [x] 2.1 In `src/shared/lib/account/service.ts`: add optional `decryptionFailed?: true`
  to `ExportedCvProfile`. In `exportAccountData`, wrap the `getRawText` call for
  each profile in a try/catch; on throw, push `{ rawText: null, decryptionFailed: true }`
  and log a structured server-side message with the profile id and a stable code —
  no key value, no CV plaintext, no blob content (NFR-SEC-01).
- [x] 2.2 In `src/shared/lib/db/cv-profile-repo.ts`: wrap `decryptString` in
  `getRawText` with a try/catch; on failure return `null` rather than throwing.
  Add a server-side log line with profile id only (no key material, NFR-SEC-01).
  Note: the catch in 2.1 is the primary guard; 2.2 adds defense-in-depth at the
  repo boundary.

## 3. ExportDataButton client component

- [x] 3.1 Create `src/features/export-data-button/ui/ExportDataButton.tsx`
  (client component, `"use client"`). Props: `locale?: Locale`. State machine:
  `idle | pending | error` (mirrors `DeleteAccountButton` shape). On click:
  set pending, `fetch('/api/account/export')`, on ok extract blob via
  `response.blob()`, create an object URL, trigger a synthetic `<a>` click for
  download, revoke the URL. On any non-ok response or catch: set error. Renders
  the `exportPending` string while pending; renders `exportAction` when idle;
  shows `exportError` via `role="alert"` paragraph on error. No navigation, no
  `href` attribute on the trigger.
- [x] 3.2 Create `src/features/export-data-button/index.ts` (barrel, exports
  `ExportDataButton`).
- [x] 3.3 In `src/views/account-profile/ui/AccountProfileView.tsx`: replace the
  `<Button href="/api/account/export" ...>` with `<ExportDataButton locale={locale} />`.
  Remove the wrapping `<div>` if the component renders its own container. Keep
  the surrounding `<div className="flex flex-col gap-4">` structure intact.

## 4. Tests

- [x] 4.1 `src/features/export-data-button/ui/ExportDataButton.test.tsx`:
  - idle: renders `exportAction` string.
  - success: mocks `fetch` returning ok + blob, asserts download anchor created
    and click fired, no navigation.
  - failure (non-ok): mocks `fetch` returning 500, asserts `role="alert"` with
    `exportError` string rendered.
  - failure (network): mocks `fetch` throwing, same assert.
  - pending: fetch does not resolve; asserts `exportPending` string visible and
    button not re-activatable.
- [x] 4.2 `src/shared/lib/db/cv-profile-repo.test.ts`: add a case for `getRawText`
  where `decryptString` throws — assert `null` is returned (no throw).
- [x] 4.3 `src/shared/lib/account/service.ts` (unit or integration test): add a
  case where one profile's `getRawText` rejects — assert the export still resolves
  with all profiles present, the failing one has `rawText: null` and
  `decryptionFailed: true`, and the others have their text.
- [x] 4.4 `src/app/api/account/export/route.test.ts`: add a case where one profile
  fails decryption — assert the route returns 200 with a body containing the
  partial profile (`decryptionFailed: true`), not 500. Assert the response body
  contains no key material.
- [x] 4.5 `src/views/account-profile/ui/AccountProfileView.test.tsx`: assert the
  GDPR section no longer contains an anchor pointing to `/api/account/export`
  (the old plain-link pattern is removed).

## 5. Verify

- [x] 5.1 `yarn lint` clean — no new lint errors, FSD import rule respected
  (`export-data-button` feature imports only from `shared` and `entities`).
- [x] 5.2 `yarn build` clean — no TypeScript errors; confirm `ExportedCvProfile`
  with optional `decryptionFailed` is compatible at all call sites.
- [x] 5.3 `yarn test` green — all pre-existing tests pass; new tests from task 4
  are included in the count.

## 6. Independent review (maker != checker)

- [x] 6.1 Run the `checker-review` subagent (fresh context, read-only) against the
  diff of this change. Verify: (a) no anchor remains for the export CTA,
  (b) no log line contains key material or CV text in the new paths,
  (c) the partial-export 200 path is covered by a test,
  (d) `decryptionFailed` does not leak internal error messages.
  Record the verdict and any confirmed findings in `docs/current-state.md`.
- [x] 6.2 Update `docs/current-state.md` with last action, evidence (test count),
  and remaining blockers (prod env still unset).
