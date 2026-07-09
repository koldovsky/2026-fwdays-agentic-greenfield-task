# Legal pages: Privacy Policy + public offer

## Why

Vouch has no legal pages. `src/views/landing/ui/Footer.tsx` renders a "Privacy"
link with `href="#"` — a dead stub that goes nowhere (a T4 gap). The privacy
commitments the product already makes in code and copy (no trackers, CV is PII
encrypted at rest and never used for training, GDPR export + delete) are stated
only in landing FAQ prose, not in a durable policy a user or regulator can cite
(BC-PRIVACY-01, BC-PRIVACY-02, NFR-GDPR-01, NFR-GDPR-02).

A payment flow additionally needs a public offer document (публічна оферта) — the
Ukrainian legal instrument that a purchase accepts. T13 (Stripe checkout) cannot
surface the terms a buyer agrees to until that document exists at a stable public
URL, so this change **unblocks T13**.

Both pages are static and tracker-free by construction, so they carry no
architectural risk. The change is content + wiring only. The copy itself is a
legal instrument and **requires legal-counsel sign-off before publish** — this
proposal ships the structure, routes, and wiring; final wording is gated on
counsel review (see Impact).

## What Changes

- New `views/legal` FSD slice rendering two static, tracker-free pages:
  - **Privacy Policy** — states the data Vouch holds (account, encrypted CV,
    tailoring history), that there are no third-party trackers/analytics on any
    page, that CV text is PII encrypted at rest and never used for model
    training, and the concrete GDPR self-serve rights (JSON export, permanent
    delete propagating within 24h) with pointers to the account UI that exercises
    them.
  - **Public offer (публічна оферта)** — the Ukrainian public-offer document a
    purchase accepts: parties, service description, the Free / Pro / Job-hunt Pass
    plans and prices, payment + refund terms, and acceptance-by-purchase language.
- Two thin Next App Router leaves (`/privacy`, `/oferta`) each rendering the
  corresponding `views/legal` slice and nothing else (system-design §5.2).
- Fix the dead footer stub: point the "Privacy" link at `/privacy` and add an
  offer link, sourced from a typed link list rather than a hardcoded `href="#"`.
- Add a legal-terms link to the checkout screen (`src/views/checkout/ui/CheckoutView.tsx`)
  pointing at `/oferta`, so the buyer sees the offer they are accepting — the
  seam T13 needs.
- Register `/privacy` and `/oferta` in `src/app/sitemap.ts`; they are already
  crawlable under `robots.ts` (only `/tailor` and `/api/` are disallowed).
- Copy lives in the i18n layer (`shared/lib/i18n`, Ukrainian-first per
  NFR-I18N-01) with English fallback, matching how `checkout`/`profile` copy is
  already structured; page bodies stay tracker-free (BC-PRIVACY-01).

## Capabilities

### New Capabilities

- `legal`: static, tracker-free legal pages — a Privacy Policy backing the
  product's privacy and GDPR commitments, and a Ukrainian public offer that a
  purchase accepts — reachable from the footer and the checkout screen and listed
  in the sitemap.

### Modified Capabilities

_None._

## Impact

- New code:
  - `src/views/legal/` slice (`ui/`, `index.ts` public API) rendering both pages.
  - `src/app/privacy/page.tsx`, `src/app/oferta/page.tsx` — thin route leaves.
  - `src/shared/lib/i18n/{ua,en,types}.ts` — `legal` copy sections (both locales).
- Touched code (wiring only):
  - `src/views/landing/ui/Footer.tsx` (+ `src/views/landing/lib/content.ts`) —
    replace the `href="#"` Privacy stub with real `/privacy` + `/oferta` links.
  - `src/views/checkout/ui/CheckoutView.tsx` — add the `/oferta` terms link.
  - `src/app/sitemap.ts` — add both URLs.
- New spec: `openspec/specs/legal/spec.md` (baseline created on archive).
- No route handler, API, data model, or dependency changes. No new brand hues,
  emoji, or icon libraries (DESIGN.md).
- **Legal review gate:** the policy and offer copy are legal instruments; final
  wording (parties, prices, refund terms, retention periods) requires
  legal-counsel sign-off before publish. Structure and wiring ship now; copy is a
  placeholder pending that sign-off (open question in tasks Verify group).
- Unblocks T13 (Stripe checkout must surface legal terms at a stable public URL).
