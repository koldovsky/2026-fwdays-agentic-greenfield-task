## 1. Legal copy (i18n)

- [x] 1.1 Add a `legal` section to `src/shared/lib/i18n/types.ts` typing both documents (privacy policy + public offer), Ukrainian-first with an English fallback (NFR-I18N-01)
- [x] 1.2 Author the Privacy Policy copy in `ua.ts` + `en.ts`: data held (account, encrypted CV, tailoring history), no third-party trackers/analytics on any page (BC-PRIVACY-01), CV is PII encrypted at rest and never used for model training (BC-PRIVACY-02), and the GDPR rights — JSON export (NFR-GDPR-01) and permanent delete within 24h (NFR-GDPR-02) — with pointers to the account UI that exercises them
- [x] 1.3 Author the public-offer (публічна оферта) copy in `ua.ts` + `en.ts`: parties, service description, the Free / Pro / Job-hunt Pass plans + prices, payment/refund terms, acceptance-by-purchase language
- [x] 1.4 Mark both copy blocks as placeholder pending legal-counsel sign-off (comment + a visible draft note the sign-off step removes); no tracker/analytics markup in either body (BC-PRIVACY-01)

## 2. `views/legal` slice

- [x] 2.1 Scaffold the `views/legal` slice via fsd-scaffold (`ui/`, `index.ts` public API) rendering from the `legal` i18n copy; use only design-system tokens/components (`shared/ui`) — no new brand hues, emoji, or icon libraries (DESIGN.md)
- [x] 2.2 Render the Privacy Policy page component (static, no data fetch, no client script) — accessible document structure (single `h1`, sectioned headings)
- [x] 2.3 Render the public-offer page component (static, no data fetch) with the same document structure
- [x] 2.4 Add slice unit tests: both pages render, contain the required privacy/GDPR statements, and emit no `<script>`/tracker markup

## 3. Routes

- [x] 3.1 Add `src/app/privacy/page.tsx` — thin leaf rendering `views/legal` Privacy page, with `metadata` (title/description, canonical `/privacy`) resolved from the `legal` i18n copy
- [x] 3.2 Add `src/app/oferta/page.tsx` — thin leaf rendering `views/legal` public-offer page, with `metadata` (canonical `/oferta`)
- [x] 3.3 Confirm both routes prerender static and are crawlable under existing `src/app/robots.ts` (only `/tailor` + `/api/` disallowed)

## 4. Wiring

- [x] 4.1 Replace the dead `href="#"` Privacy stub in `src/views/landing/ui/Footer.tsx` with a real `/privacy` link, sourced from a typed legal-link list in `src/views/landing/lib/content.ts`; add an offer (`/oferta`) link alongside it (FR-SALES-01, FR-SHELL-01)
- [x] 4.2 Add an `/oferta` terms link to `src/views/checkout/ui/CheckoutView.tsx` so the buyer sees the offer they accept (FR-PAYWALL-02); copy from the `checkout` i18n section
- [x] 4.3 Register `/privacy` and `/oferta` in `src/app/sitemap.ts` (both absolute via `absoluteUrl`, appropriate `changeFrequency`/`priority`)

## 5. Verify

- [x] 5.1 Run agent-verify (build/typecheck/lint/test) and confirm the FR/NFR evidence: footer + checkout links resolve, both pages prerender static and tracker-free, sitemap lists both URLs (BC-PRIVACY-01, NFR-GDPR-01/02)
- [ ] 5.2 Run checker-review against PRD IDs, DESIGN.md brand rules, and the FSD import rules (views → shared only)
- [ ] 5.3 **Legal sign-off gate:** confirm final Privacy + offer wording is reviewed and approved by legal counsel before the draft note is removed and the pages are treated as published; record the open question in `docs/current-state.md`
- [x] 5.4 Update `docs/current-state.md` (last action + timestamp, working-on IDs, next steps, note T13 unblocked)
