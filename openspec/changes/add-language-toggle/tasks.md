# Tasks — add-language-toggle

## 1. Fonts (design-system)

- [x] 1.1 `layout.tsx`: swap Bricolage/Hanken for `Unbounded` (display) + `Golos_Text` (body), `subsets: ["latin", "cyrillic"]`, `display: "swap"`, weights pinned (Unbounded 600/700, Golos 400/500/600/700). CSS-var wiring kept.
- [x] 1.2 `globals.css` `@theme`: repointed `--font-display`/`--font-body`/`--font-sans`; mirrored in `docs/DESIGN.md` + design-system text sources (static HTML specimens left as frozen artifacts).

## 2. Locale mechanism (app-shell)

- [x] 2.1 Locale helpers in `shared/lib/i18n` (framework-free, TC-PURE-01): `parseLocale` (Ukrainian-first default), `LOCALE_COOKIE`, `LOCALES`, `HTML_LANG`. Client cookie writer in `features/language-switch/lib/cookie.ts` (Secure over HTTPS). +tests.
- [x] 2.2 Root `layout.tsx`: async, resolves the cookie locale, sets `<html lang>` (`uk`/`en`).
- [x] 2.3 `LanguageSwitch` (feature) in the top bar: UA|EN segmented control, aria-pressed + accessible group label + focus (NFR-A11Y-01), sets cookie, `router.refresh()`. Barrel is client-safe (no next/headers). +tests.

## 3. Flip call sites

- [x] 3.1 Every page resolves the cookie locale (inline `parseLocale` + `cookies()`) and passes it to TopBar/TopBarSession + its view; landing dropped the pinned `"en"` and now defaults `ua`.

## 4. Guards

- [x] 4.1 Ukrainian-first default preserved (parseLocale + all view defaults = ua); no URL locale prefix; BC-BRAND-01 (no new hue/emoji/exclamation/em-dash).
- [x] 4.2 `<html lang>` uses `uk` for Ukrainian (BCP-47), `en` for English.

## 5. Verify

- [x] 5.1 `yarn lint` + `yarn build` + `yarn test` green (104 files / 646 tests). Added LanguageSwitch + parseLocale tests; global next/navigation stub in vitest.setup for useRouter.
- [ ] 5.2 `perf-audit` vs NFR-PERF-04 — blocked in sandbox (no Chrome). MUST run before prod: (a) heavier Cyrillic fonts, (b) landing now dynamic (`ƒ`) from the cookie read. Both are documented tradeoffs.
- [x] 5.3 verifier + checker subagents (maker≠checker): gate PASS; 4-lens adversarial review, all confirmed findings (ua-default, secure cookie, pinned weights, stale comment) fixed. `openspec validate` + archive pending (CLI not installed here).
