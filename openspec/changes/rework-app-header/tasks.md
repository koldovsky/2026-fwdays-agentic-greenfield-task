## 1. Anchor scroll padding

- [x] 1.1 Add `scroll-padding-top: 4rem` to `html` in `src/app/globals.css` (matches the sticky `h-16` bar) so anchor targets clear the header on every route — FR-SHELL-01, NFR-OBS-02

## 2. Marketing-nav isolation

- [x] 2.1 Add a `showMarketingNav` prop to `TopBar` (default `false`); render the Features/Pricing anchors only when true — FR-SHELL-01
- [x] 2.2 `TopBarSession` (landing) passes `showMarketingNav`; app-shell routes render `TopBar` without it

## 3. Signed-in identity in the header

- [x] 3.1 Show the signed-in user's first name in the header row next to the burger (truncated, `sm:` and up), Ukrainian-first via `shared/lib/i18n` — FR-SHELL-01, NFR-I18N-01, NFR-A11Y-01

## 4. Tests + verify

- [x] 4.1 TopBar tests: marketing nav hidden by default, shown when `showMarketingNav`; user name rendered when signed in and absent when anonymous
- [x] 4.2 TopBarSession test: authenticated passes through name + `showMarketingNav`
- [x] 4.3 `yarn lint` + `yarn build` + `yarn test` clean (521 tests). Run checker-review + `openspec validate rework-app-header` before archive (pending — CLI not installed here)
