# premium-attach (delta)

## ADDED Requirements

### Requirement: Paid-gated PDF attachment
The system SHALL let a paid user attach the original PDF of their CV to the
tailoring request so the generation pass receives the document in addition to the
parsed text. The attachment SHALL be honored only after a server-side check of
paid entitlement (`hasPaidAccess`); a client-supplied attach flag SHALL NOT be
trusted. The upload SHALL be validated as a PDF, size-capped, and its bytes SHALL
never be logged. Implements FR-CV-01, FR-PAYWALL-02, NFR-SEC-01, NFR-SEC-02.

#### Scenario: Paid user attaches a PDF
- **WHEN** a paid user attaches a valid PDF and runs a tailoring
- **THEN** the generation pass receives the PDF as a document input alongside the parsed text
- **AND** the server confirmed paid access before honoring the attachment

#### Scenario: Free user cannot attach
- **WHEN** a free or anonymous request includes an attach flag or attached bytes
- **THEN** the server ignores the attachment and runs the normal text-only flow
- **AND** no error leaks that reveals internal handling (calm degradation)

### Requirement: Attachment never reaches the grounding pass
The original PDF SHALL be used only in the generation pass. The grounding pass
input SHALL remain text-only and unchanged, and the attachment SHALL be on the
grounding-forbidden denylist. Every bullet SHALL still be grounded against the
candidate's own CV text and flagged overclaim-risk when it cannot be, with no
exemption for content sourced from the attachment. Implements BC-HONESTY-01,
BC-HONESTY-02, FR-BULLETS-03.

#### Scenario: Grounding stays isolated
- **WHEN** a tailoring runs with an attached PDF
- **THEN** the grounding pass receives no PDF or document block, only the existing text inputs
- **AND** a bullet that cannot be grounded in the candidate's CV text is still flagged overclaim-risk and excluded from export by default

### Requirement: Disabled attach control with upgrade path for free users
The upload step SHALL render the attach control for free and anonymous users in a
disabled state with a "premium" badge, and activating it SHALL open an upgrade
surface driven by a dedicated paywall reason (`attach`). The control SHALL use
only design-system tokens and components (no new hue, emoji, or icon library).
Implements FR-PAYWALL-01, FR-PAYWALL-02, BC-BRAND-01.

#### Scenario: Free user sees the premium affordance
- **WHEN** a free or anonymous user views the upload step
- **THEN** the attach control is visible but disabled with a "premium" badge
- **AND** activating it opens the upgrade surface for the `attach` reason
