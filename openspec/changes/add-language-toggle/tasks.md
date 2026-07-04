# Tasks — add-language-toggle

## 1. Fonts (design-system)

- [ ] 1.1 `layout.tsx`: swap Bricolage/Hanken for `Unbounded` (display) + `Golos_Text` (body), `subsets: ["latin", "cyrillic"]`, `display: "swap"`; keep the CSS-var wiring.
- [ ] 1.2 `globals.css` `@theme`: repoint `--font-display`/`--font-body`/`--font-sans` to the new faces; mirror in `docs/vouch-design-system/` + DESIGN.md note (sync rule).

## 2. Locale mechanism (app-shell)

- [ ] 2.1 Locale cookie helper: server read (default `ua`) + a client setter; framework-free parsing where possible (TC-PURE-01).
- [ ] 2.2 Root `layout.tsx`: resolve the cookie locale, set `<html lang>` dynamically (`uk`/`en`).
- [ ] 2.3 `LanguageSwitch` control in the top bar: keyboard + a11y (NFR-A11Y-01), sets the cookie, refreshes.

## 3. Flip call sites

- [ ] 3.1 Each page resolves the cookie locale and passes it to its view; landing drops the pinned `"en"`.

## 4. Guards

- [ ] 4.1 Ukrainian-first default preserved (t() default ua); no URL locale prefix; BC-BRAND-01 (no new hue/emoji/exclamation/em-dash).
- [ ] 4.2 `<html lang>` uses `uk` for Ukrainian (BCP-47), `en` for English.

## 5. Verify

- [ ] 5.1 `yarn lint` + `yarn build` + `yarn test` green; add LanguageSwitch + cookie-helper tests.
- [ ] 5.2 `perf-audit` vs NFR-PERF-04 (font payload grew) — blocked in sandbox (no Chrome); MUST run before prod.
- [ ] 5.3 verifier + checker subagents (maker≠checker). `openspec validate` + archive pending (CLI not installed here).
