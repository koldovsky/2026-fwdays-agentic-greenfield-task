# upload-cv (delta)

## MODIFIED Requirements

### Requirement: Split dropzone: ungated text parse and paid-gated PDF attach
The upload step SHALL be composed of two distinct zones: a `TextUploadZone`
that calls `POST /api/cv/parse` and is available to all users including anonymous
visitors (FR-ONBOARD-01, FR-CV-01), and a `PremiumAttachZone` that allows a
paid user to attach the original PDF to the generation request. The two zones
SHALL be composed inside the existing `UploadCvDropzone` so that its external
props contract and all call sites remain unchanged. Implements FR-CV-01,
FR-ONBOARD-01, FR-PAYWALL-01, FR-PAYWALL-02, NFR-SEC-04, BC-HONESTY-01.

#### Scenario: Anonymous user parses a CV file
- **WHEN** an anonymous visitor drops or selects a valid CV file in the
  `TextUploadZone`
- **THEN** the file is posted to `POST /api/cv/parse`, the extracted text is
  returned and surfaced in the CV textarea
- **AND** no sign-in or payment is required for this action (FR-ONBOARD-01)

#### Scenario: Free authenticated user parses a CV file
- **WHEN** a signed-in free-tier user uploads a valid CV file in the
  `TextUploadZone`
- **THEN** extraction succeeds identically to the anonymous path; the parse
  route applies no paid gate

#### Scenario: Paid user attaches the original PDF
- **WHEN** a paid user drops or selects a PDF in the `PremiumAttachZone`
- **THEN** the attachment is read as base64 and passed to the parent via
  `onAttachmentChange`
- **AND** the server gate in `/api/tailor/generate` confirms paid access before
  honoring it (NFR-SEC-04, BC-HONESTY-01)

### Requirement: Premium zone is visually gated for non-paid users with input disabled
For non-paid and anonymous users, `PremiumAttachZone` SHALL render the attach
area blurred under a semi-transparent Premium banner containing a headline, a
short description, and an upgrade CTA. The underlying file input and all drag-
and-drop event handlers SHALL be disabled while the overlay is present, so the
zone cannot be interacted with from the client without paid status. The banner
CTA SHALL open the paywall upgrade surface. Implements FR-PAYWALL-01,
FR-PAYWALL-02, NFR-A11Y-01, BC-BRAND-01.

#### Scenario: Non-paid user sees the blurred premium zone
- **WHEN** a non-paid or anonymous user views the upload step
- **THEN** `PremiumAttachZone` renders with a blur filter and a semi-transparent
  Premium banner overlay
- **AND** the file input is disabled (or absent) and drag events on the zone do
  not trigger any file handling
- **AND** the banner headline, body, and upgrade CTA are visible and legible

#### Scenario: Upgrade CTA opens the paywall
- **WHEN** a non-paid user activates the upgrade CTA inside the Premium banner
- **THEN** the paywall opens with the `attach` reason (or equivalent reason
  already in the paywall system)
- **AND** the CTA is keyboard-reachable and has a visible focus style (NFR-A11Y-01)

#### Scenario: Overlay is cosmetic; server gate is the trust boundary
- **WHEN** a user removes the overlay via browser devtools and submits a
  tailoring request with an attachment payload
- **THEN** `/api/tailor/generate` evaluates `hasPaidAccess` server-side, sets
  `attachmentAllowed = false` for a non-paid caller, and silently discards the
  attachment
- **AND** a text-only tailoring completes with no error surfaced to the user
  (calm degradation, BC-HONESTY-01, OWASP A01, NFR-SEC-04)
- **AND** no premium behavior is granted from a forged client flag

#### Scenario: Paid flag is always server-derived
- **WHEN** the tailor workspace page renders
- **THEN** the `paid` prop passed to `UploadCvDropzone` (and therefore to
  `PremiumAttachZone`) is resolved exclusively in `src/app/tailor/page.tsx`
  via `hasPaidAccess` against the subscription store
- **AND** no client-side logic derives or overrides paid status

### Requirement: Premium zone i18n keys follow Ukrainian-first convention
The Premium banner headline, description, and upgrade CTA SHALL be driven by
new `uploadCv.premiumZone.*` keys in `shared/lib/i18n/types.ts`, authored in
Ukrainian first and mirrored in English. Keys SHALL contain no emoji, no
exclamation points, and no em-dashes (BC-BRAND-01, NFR-I18N-01).

#### Scenario: Ukrainian locale renders the Premium banner in Ukrainian
- **WHEN** the locale resolves to `ua`
- **THEN** the Premium banner headline, body, and CTA render in Ukrainian using
  the `ua.ts` dictionary values for `uploadCv.premiumZone.*`

#### Scenario: English locale renders the Premium banner in English
- **WHEN** the locale resolves to `en`
- **THEN** the same keys render in English using the `en.ts` values

#### Scenario: i18n parity test catches a missing key
- **WHEN** `yarn test` runs the i18n parity guard (already in `i18n.test.ts`)
- **THEN** the test fails if any `uploadCv.premiumZone.*` key is present in
  `en.ts` but absent in `ua.ts`, or vice versa

### Requirement: Design tokens only, no new brand elements
`PremiumAttachZone` and its Premium banner SHALL use only existing design-system
tokens and the `Button` component. No new hue, no icon library, no new font
weight, no emoji shall be introduced. Implements BC-BRAND-01.

#### Scenario: Design-token audit
- **WHEN** the component renders
- **THEN** all colors, spacing, typography, border, and shadow values are
  sourced from the existing `@theme` token set in `globals.css`
- **AND** no inline style with a raw hex or RGB value appears in the component
