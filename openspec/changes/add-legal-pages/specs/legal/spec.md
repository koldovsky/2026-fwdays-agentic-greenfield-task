## ADDED Requirements

### Requirement: Privacy Policy page
The system SHALL serve a static Privacy Policy page at a stable public URL
(`/privacy`) that states the personal data Vouch holds (account details,
encrypted CV text, tailoring history), affirms that CV text is PII encrypted at
rest and never used for model training, and describes the user's data rights.
The page SHALL be rendered by the `views/legal` slice from centralized i18n copy
(Ukrainian-first, English fallback) and SHALL carry no third-party tracker,
analytics, or fingerprinting markup.
Implements BC-PRIVACY-01, BC-PRIVACY-02, NFR-GDPR-01, NFR-GDPR-02.

#### Scenario: Privacy page is reachable and documents data handling
- **WHEN** a visitor opens `/privacy`
- **THEN** a static page loads stating the data held, that CV text is encrypted at rest and never used for training, and that no third-party trackers run on any page

#### Scenario: Privacy page carries no trackers
- **WHEN** the `/privacy` page HTML is inspected
- **THEN** it contains no analytics scripts, third-party trackers, or fingerprinting markup

### Requirement: GDPR rights disclosure
The Privacy Policy SHALL disclose the user's GDPR self-serve rights — exporting
all stored data (CV profile + tailoring history) as JSON, and permanently
deleting the account and all associated data with deletion propagating within
24 hours — and SHALL point the user to the account UI that exercises them.
Implements NFR-GDPR-01, NFR-GDPR-02, BC-PRIVACY-02.

#### Scenario: Export and delete rights are stated
- **WHEN** a visitor reads the Privacy Policy
- **THEN** it explains that they can export all their stored data as JSON and permanently delete their account (propagating within 24h), and links to where in the account UI to do so

### Requirement: Public offer page
The system SHALL serve a static public offer (публічна оферта) page at a stable
public URL (`/oferta`) describing the parties, the service, the Free / Pro /
Job-hunt Pass plans and prices, payment and refund terms, and acceptance-by-
purchase language. The page SHALL be rendered by the `views/legal` slice from
centralized i18n copy and SHALL carry no third-party tracker or analytics markup.
Implements FR-SALES-03, FR-PAYWALL-02, BC-PRIVACY-01.

#### Scenario: Offer page is reachable
- **WHEN** a visitor opens `/oferta`
- **THEN** a static public-offer page loads describing the service, the plans and prices, and the payment/refund terms a purchase accepts

### Requirement: Footer links to legal pages
The landing footer SHALL link to the Privacy Policy (`/privacy`) and the public
offer (`/oferta`) via real routes sourced from a typed link list, replacing the
prior dead `href="#"` Privacy stub.
Implements FR-SALES-01, FR-SHELL-01, BC-PRIVACY-01.

#### Scenario: Footer Privacy link resolves
- **WHEN** a visitor clicks the "Privacy" link in the landing footer
- **THEN** they navigate to `/privacy` (not a dead `#` anchor) and the Privacy Policy renders

#### Scenario: Footer offer link resolves
- **WHEN** a visitor clicks the public-offer link in the landing footer
- **THEN** they navigate to `/oferta` and the offer page renders

### Requirement: Checkout surfaces the offer terms
The checkout screen SHALL surface a link to the public offer (`/oferta`) so the
buyer can read the terms a purchase accepts before completing payment.
Implements FR-PAYWALL-02.

#### Scenario: Buyer can reach the offer from checkout
- **WHEN** a user is on the checkout screen for any paid plan
- **THEN** a visible link to `/oferta` is present and opens the public offer describing the terms the purchase accepts

### Requirement: Legal pages listed in the sitemap
The sitemap SHALL include both `/privacy` and `/oferta` as absolute crawlable
URLs; both pages SHALL remain indexable under the existing robots rules (only
`/tailor` and `/api/` are disallowed).
Implements FR-SALES-01, BC-PRIVACY-01.

#### Scenario: Sitemap lists the legal pages
- **WHEN** `sitemap.xml` is generated
- **THEN** it includes the absolute URLs for `/privacy` and `/oferta`, and neither is disallowed by `robots.txt`
