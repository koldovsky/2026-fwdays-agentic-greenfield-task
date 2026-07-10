# Tasks — gate-premium-upload-zone

## 1. i18n keys (shared/lib/i18n)

- [x] 1.1 Add `uploadCv.premiumZone` to `types.ts` with `headline`/`body`/`upgradeAction` (additive; existing `uploadCv.*` preserved).
- [x] 1.2 Ukrainian values in `ua.ts` (headline "Оригінальний PDF", body one sentence, CTA "Оновити тариф"); no emoji/exclamation/em-dash.
- [x] 1.3 English mirror in `en.ts` (equal tone).
- [x] 1.4 `i18n.test.ts` parity guard covers the new keys, green (70 upload+i18n tests pass).

## 2. PremiumAttachZone component

- [x] 2.1 `src/features/upload-cv/ui/PremiumAttachZone.tsx`. Non-paid = blurred inert shell (`blur-sm`, `pointer-events-none`, `aria-hidden`) under an `absolute inset-0` banner; paid = live PDF drop target + file input.
- [x] 2.2 Banner uses `t(locale).uploadCv.premiumZone` + a `Button` (secondary/sm) calling `onUpgrade`; tokens only (`bg-surface-canvas/90`, `rounded-xl`, `shadow-card`, `text-ink`/`text-ink-soft`, `brand-wash` badge). No new hue/icon.
- [x] 2.3 Security: non-paid renders NO `<input type=file>` and NO drop/dragover handlers (they live only after the `if (!paid) return`) — removing the overlay leaves no client attach path.
- [x] 2.4 A11y: upgrade `Button` has an `aria-label`; blurred shell has no focusable descendants (no focus trap).
- [x] 2.5 `PremiumAttachZone.test.tsx` (11 tests): non-paid blur+banner+no-input, upgrade fires, paid input present, `onFileSelected` fires on drop+select, attached/too-large states, `renderToStaticMarkup` SSR smoke.

## 3. TextUploadZone component

- [x] 3.1 `src/features/upload-cv/ui/TextUploadZone.tsx` — extracted parse-only zone (`locale`, `onExtracted`); owns pending/error/dragActive; no attach/paid knowledge.
- [x] 3.2 `TextUploadZone.test.tsx` (8 tests) migrated the parse-path coverage; composer test kept separately.

## 4. Compose UploadCvDropzone

- [x] 4.1 `UploadCvDropzone.tsx` now composes `TextUploadZone` + `PremiumAttachZone`; external props unchanged (no call-site edit).
- [x] 4.2 Composer owns `attachedName`/`attachTooLarge` + `maybeAttach` (base64 read → `onAttachmentChange`, non-PDF clears, size cap).
- [x] 4.3 `UploadCvDropzone.test.tsx` (8 tests): free sees blurred zone+banner, paid sees live zone (2nd input), `onUpgrade` forwarded, `onExtracted` fires regardless of paid, attach base64 path + oversized guard, premium zone absent when `onAttachmentChange` omitted.

## 5. Barrel and call-site check

- [x] 5.1 Barrel unchanged — composer stays the sole public export (zones are same-slice internals).
- [x] 5.2 No cross-slice deep import (`grep upload-cv/ui/` outside the slice → 0 hits).

## 6. Security and honesty guard (evidence)

- [x] 6.1 `api/tailor/generate/route.ts:224` `attachmentAllowed=false`, flipped true only at `:252` inside the `hasPaidAccess` paid branch (`:246-250`); consumed only under `if (attachmentAllowed)` (NFR-SEC-04, OWASP A01). Unchanged by T4.
- [x] 6.2 `src/app/tailor/page.tsx:32` derives `paid` from the server-side subscription check; flows to `TailorWorkspace` → `UploadCvDropzone`.

## 7. Verify

- [x] 7.1 `yarn lint` green (0 errors, FSD rules pass).
- [x] 7.2 `yarn build` green (TS strict).
- [x] 7.3 `yarn test`: 846 passed / 848 (the only 2 red are the pre-existing `ExportDataButton` jsdom `Blob.stream` env failures in the T3 slice — confirmed red at HEAD with T4 stashed, not a T4 regression).
- [x] 7.4 `yarn test --run upload` → 6 files / 44 tests green (PremiumAttachZone 11, TextUploadZone 8, UploadCvDropzone 8, + validate-file/parse-cv-file/TailorWorkspace.upload).

## 8. Independent review (maker != checker)

- [x] 8.1 `checker` subagent (fresh context, opus) reviewed the diff: verdict fix-first, 0 blockers. Confirmed (a) free parse ungated, (b) non-paid overlay cosmetic + server gate intact, (c) no new hue/icon, (d) ua/en parity, (e) FSD clean, (f) delta-spec scenarios covered (after the two added tests), (g) props contract unchanged. `verifier` subagent (opus) PASS on all four gates.
- [x] 8.2 Both checker findings (1 major test gap + 1 minor) closed by the test-author (+4 tests) before marking done. 0 code changes required.
