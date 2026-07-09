# Harden account export UX

## Why

The GDPR export right (NFR-GDPR-01) is broken in two ways that compound each other.

**Server root cause (ops, not code):** `CV_ENCRYPTION_KEY` and `DATABASE_URL` are
unset in the production environment. `getCvEncryptionKey()` (line 19,
`src/shared/lib/crypto/key.ts`) and `getDb()` throw at request time, and the route
returns `{ error: "export_failed" }` with HTTP 500. This is an operational task
outside the scope of this change; it is documented here so the implementer does not
mistake the remaining code gaps for the root cause.

**Code gap 1 — client navigates to raw JSON on failure:** The export CTA is a plain
`<Button href="/api/account/export">` anchor (`AccountProfileView.tsx` line 87).
When the server returns 500, the browser navigates to the raw JSON error body. No
in-page error message is shown. This violates NFR-OBS-01 (the user must see a calm
failure message, never a raw server response). The delete-profile feature
(`DeleteAccountButton.tsx`) solves the same problem with a fetch-based two-phase
pattern; the export CTA should mirror it.

**Code gap 2 — one unreadable CV aborts the whole export:** `getRawText()` in
`src/shared/lib/db/cv-profile-repo.ts` (lines 71-78) calls `decryptString` which
throws on a rotated or corrupt key. Because `exportAccountData` calls `getRawText`
in a loop with no per-profile guard, a single corrupted profile causes the entire
export to throw and return 500, discarding all readable data. `ExportedCvProfile.rawText`
is already typed as `string | null`, so the type contract already anticipates a
missing value; the implementation just does not handle it gracefully. GDPR export
must be maximally inclusive: omit the unreadable text and continue, never hard-fail.

This change fixes both code gaps. The env issue remains an operational task.

## What Changes

- **Fetch-based export action:** replace the `<Button href="...">` anchor with a
  client component (`ExportDataButton`) that issues `fetch('/api/account/export')`,
  extracts the blob on 200 and triggers a download, and on any failure surfaces a
  calm inline `exportError` message in the GDPR section (mirroring `DeleteAccountButton`).
  No browser navigation to raw JSON under any condition.
- **Per-profile decrypt guard in `getRawText`:** wrap `decryptString` in a
  try/catch; on failure return `null` and set `decryptionFailed: true` on that
  `ExportedCvProfile` entry. The loop in `exportAccountData` continues over remaining
  profiles. A partial export (some `rawText: null, decryptionFailed: true`) is
  returned rather than a total 500 failure.
- **i18n:** add `exportError` (calm, NFR-OBS-01) and `exportPending` strings to the
  `profile` section in `shared/lib/i18n` types, ua, and en. `exportAction` already
  exists.
- **Security (NFR-SEC-01):** no key material, no CV plaintext, no blob data in any
  log line. The `decryptionFailed` flag in the export payload is metadata only; it
  communicates that a profile's text could not be decrypted, nothing more.
- **Not in scope:** re-provisioning the production environment (`CV_ENCRYPTION_KEY`,
  `DATABASE_URL`); that is an operational step documented in `docs/current-state.md`.

## Capabilities

### Modified Capabilities

- `account`: the GDPR export right is hardened with a fetch-based client action
  (inline error on failure, blob download on success) and a per-profile decrypt
  guard so a single unreadable CV does not abort the whole export.

## Impact

- `src/views/account-profile/ui/AccountProfileView.tsx`: replace the `Button` anchor
  with `<ExportDataButton locale={locale} />`.
- New client component: `src/features/export-data-button/` (or inline in
  `account-profile/ui/`) mirroring `DeleteAccountButton` structure.
- `src/shared/lib/db/cv-profile-repo.ts`: `getRawText` catch block returns `null`
  on decrypt failure.
- `src/shared/lib/account/service.ts`: `ExportedCvProfile` gains optional
  `decryptionFailed?: true`; the assembly loop catches per-profile throws and
  continues.
- `src/shared/lib/i18n/types.ts`, `ua.ts`, `en.ts`: add `exportError` and
  `exportPending` to the `profile` section.
- Tests: `account-profile` view test, `cv-profile-repo` unit test for the
  decrypt-failure path, `account/export` route test for the partial-profile scenario,
  new `ExportDataButton` component tests.
- NFR-SEC-01: verified no key/blob/CV text in any new log line.

## Open question

None. The decision to omit unreadable profiles (return `rawText: null,
decryptionFailed: true`) rather than hard-fail is resolved in scope: GDPR-graceful,
and the type already permits `null`.
