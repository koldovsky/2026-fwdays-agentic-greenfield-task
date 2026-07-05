# Tasks — gate-premium-upload-zone

## 1. i18n keys (shared/lib/i18n)

- [ ] 1.1 Add `uploadCv.premiumZone` to `shared/lib/i18n/types.ts` with three
  string keys: `headline`, `body`, and `upgradeAction`. Preserve all existing
  `uploadCv.*` keys; this is an additive-only change to the type.
- [ ] 1.2 Author the Ukrainian values in `ua.ts`: calm, direct copy for the
  banner headline (e.g. "Оригінальний PDF"), body (one sentence explaining the
  premium benefit), and upgrade CTA. No emoji, no exclamation, no em-dash
  (BC-BRAND-01, NFR-I18N-01).
- [ ] 1.3 Mirror the same keys in `en.ts` with English equivalents of equal
  length and tone.
- [ ] 1.4 Confirm `i18n.test.ts` parity guard covers the new keys and passes
  (`yarn test --run i18n`).

## 2. PremiumAttachZone component

- [ ] 2.1 Create `src/features/upload-cv/ui/PremiumAttachZone.tsx`. Props:
  `locale`, `paid`, `attachedName`, `attachTooLarge`, `onFileSelected` (called
  with a `File` for paid users), `onClearAttachment`, `onUpgrade`. When
  `paid = false`, render the attach area blurred (`blur-sm`, `pointer-events-none`
  on the inner content) with a semi-transparent Premium banner overlay on top
  (`absolute inset-0`). When `paid = true`, render the live drop target with drag-
  and-drop handlers and a file input (mirrors the existing inline attach behavior).
- [ ] 2.2 Premium banner (non-paid state): `headline` + `body` from
  `t(locale).uploadCv.premiumZone`, then a `Button` (variant `"secondary"`,
  size `"sm"`) labeled `upgradeAction` that calls `onUpgrade`. The banner uses
  only design tokens: `bg-surface-canvas/90`, `rounded-xl`, `shadow-card`,
  `text-ink`, `text-ink-soft`. No new hue, no icon library (BC-BRAND-01).
- [ ] 2.3 Disabled state correctness: the underlying `<input type="file">` is
  absent or has `disabled` set; `onDrop` / `onDragOver` handlers are not attached
  to the blurred wrapper when `paid = false`, so removing the overlay via devtools
  still leaves no client event path to a file read.
- [ ] 2.4 Accessible: the upgrade `Button` has a descriptive `aria-label` if its
  visible text alone is insufficient; the overlay does not trap keyboard focus
  when non-paid (NFR-A11Y-01).
- [ ] 2.5 Write `PremiumAttachZone.test.tsx`: (a) non-paid renders blur class and
  banner copy; (b) upgrade button calls `onUpgrade`; (c) paid renders without
  blur and with a file input; (d) `renderToStaticMarkup` SSR smoke test.

## 3. TextUploadZone component

- [ ] 3.1 Extract the existing parse-only portion of `UploadCvDropzone` into
  `src/features/upload-cv/ui/TextUploadZone.tsx`. Props: `locale`, `onExtracted`,
  `pending`, `error`. Logic: drag-and-drop, click-to-browse, calls `parseCvFile`,
  calls `onExtracted` on success, exposes `error` + `pending` state via props
  (or internal state plus `onError` / `onPending` callbacks; keep it simple).
  This component has no knowledge of attachment or paid status.
- [ ] 3.2 Migrate existing `UploadCvDropzone.test.tsx` coverage of the parse path
  to `TextUploadZone.test.tsx`; keep the existing test file for the composer
  (step 4).

## 4. Compose UploadCvDropzone

- [ ] 4.1 Refactor `src/features/upload-cv/ui/UploadCvDropzone.tsx` to compose
  `TextUploadZone` and `PremiumAttachZone`. The external props interface
  (`locale`, `onExtracted`, `paid`, `onAttachmentChange`, `onUpgrade`) is
  unchanged so no call site needs updating.
- [ ] 4.2 Internal state: `pending`, `error`, `attachedName`, `attachTooLarge`
  remain owned by the composer as today; `maybeAttach` logic moves into
  `PremiumAttachZone` or a shared handler in the composer.
- [ ] 4.3 Update `UploadCvDropzone.test.tsx`: add integration-level tests that
  confirm (a) free users see the blurred zone + banner; (b) paid users see the
  live zone; (c) `onUpgrade` is forwarded to the banner CTA; (d) `onExtracted`
  still fires after a successful parse regardless of `paid`.

## 5. Barrel and call-site check

- [ ] 5.1 Update `src/features/upload-cv/index.ts` if `TextUploadZone` or
  `PremiumAttachZone` need to be exported (only if a widget or view imports them
  directly; prefer keeping the composer as the sole public export).
- [ ] 5.2 Verify no call site imports an internal path across slices (`grep -r
  "upload-cv/ui/Upload" src/` excluding the slice itself should show zero hits
  other than the barrel re-export).

## 6. Security and honesty guard (non-code, evidence-gathering)

- [ ] 6.1 Confirm by reading `src/app/api/tailor/generate/route.ts` lines 188-258
  that `attachmentAllowed` is still initialized to `false` and set to `true`
  only inside the `hasPaidAccess` branch. Document the line range in the PR
  description as evidence (NFR-SEC-04, OWASP A01).
- [ ] 6.2 Confirm by reading `src/app/tailor/page.tsx` that the `paid` prop
  passed to `TailorWorkspace` (and ultimately to `UploadCvDropzone`) is derived
  exclusively from the server-side subscription check. Document as evidence.

## 7. Verify

- [ ] 7.1 `yarn lint` green (no ESLint errors, no FSD import-rule violations).
- [ ] 7.2 `yarn build` green (TypeScript strict, no unused exports).
- [ ] 7.3 `yarn test` green; confirm test count is at least the pre-change count
  plus the new tests from steps 2.5, 3.2, and 4.3. Record the file and test
  counts in the PR description as evidence.
- [ ] 7.4 Run `yarn test --run upload` and confirm all upload-cv tests pass,
  including the new `PremiumAttachZone` and `TextUploadZone` suites.

## 8. Independent review (maker != checker)

- [ ] 8.1 Invoke the checker subagent (or `checker-review` skill) on the diff.
  It must verify: (a) the free parse path is ungated end-to-end; (b) the
  non-paid overlay is cosmetic only and the server gate remains the trust
  boundary; (c) no new hue or icon library is introduced; (d) i18n parity
  ua/en; (e) FSD import rule not violated; (f) all scenarios from the delta
  spec have corresponding test coverage.
- [ ] 8.2 Address all blocker findings before marking this change done.
