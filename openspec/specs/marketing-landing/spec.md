# marketing-landing

## Purpose

The public landing page — Vouch's front door for anonymous visitors. A
server-rendered `views/landing` slice that sells the honesty differentiator with
a static example demo (grounded + overclaim-risk bullets, match-score checklist),
a three-plan pricing table, and an accessible FAQ, then routes visitors into the
free tailoring flow. No tailoring or network request runs on load; the FAQ is the
only interactive piece; no third-party trackers. Traces: FR-SALES-01/02/03,
FR-SHELL-03, NFR-A11Y-01, BC-BRAND-01, BC-PRIVACY-01.

## Requirements

### Requirement: Public landing page sections
The system SHALL render a public landing page at `/` composed of, in order: a
sticky header (logo, nav links How it works / Pricing / FAQ, Sign in + Try free
CTAs), a hero with positioning copy and a primary CTA, a honesty-pillars section,
a grounded before/after section, a match-score checklist preview, a how-it-works
section, a pricing table, a FAQ, a final CTA block, and a footer. The page SHALL
NOT start any tailoring or network request on load. Implements FR-SALES-01,
FR-SHELL-03.

#### Scenario: All sections present on load
- **WHEN** an anonymous visitor opens `/`
- **THEN** the header, hero, pillars, before/after, checklist, how-it-works, pricing, FAQ, final CTA, and footer are all rendered
- **AND** no tailoring job or data request is triggered automatically

#### Scenario: Primary CTA starts the flow
- **WHEN** the visitor activates the hero primary CTA ("Tailor my CV")
- **THEN** they are routed to the `/tailor` workspace without being required to sign in first

### Requirement: Static honest demo
The system SHALL show a static, example-data demo of a tailored result: at least
one grounded ("Vouched") bullet linked to CV evidence and one `overclaim-risk`
bullet marked as excluded from export, plus a checklist with rows in the met,
partial, gap, and overclaim-risk states and a numeric match score. The demo SHALL
require no sign-in and issue no network call. Implements FR-SALES-02.

#### Scenario: Demo shows grounded and overclaim examples
- **WHEN** the landing page renders the demo and checklist
- **THEN** a Vouched bullet and an overclaim-risk (excluded) bullet are both visible
- **AND** the checklist shows the four status states with a match score, using only static example data

### Requirement: Pricing table
The system SHALL render a pricing table with three plans — Free, Pro (monthly),
and Job-hunt Pass (one-time, 30 days) — each showing its price, billing cadence,
a feature list, and a call-to-action. Renewal prices SHALL be shown as plain
numbers. Implements FR-SALES-03.

#### Scenario: Three plans with honest pricing
- **WHEN** the visitor views the pricing section
- **THEN** Free, Pro, and Job-hunt Pass are shown with price, cadence, feature list, and CTA
- **AND** the Pro renewal price is displayed as a plain number, not obscured

### Requirement: FAQ accordion
The system SHALL render the FAQ as an accessible accordion: each question is a
button that toggles its answer, exposes `aria-expanded`, and is operable by
keyboard. Implements FR-SALES-01, NFR-A11Y-01.

#### Scenario: Toggle a question
- **WHEN** the visitor activates a FAQ question via mouse or keyboard
- **THEN** its answer expands, `aria-expanded` becomes `true`, and activating it again collapses the answer

### Requirement: Brand and privacy compliance
The landing page SHALL use only the defined design tokens and `shared/ui`
components — no new brand hues, emoji, exclamation points, or icon libraries —
and SHALL load no analytics or third-party trackers. Every interactive element
SHALL have a visible focus style and an accessible name. Implements BC-BRAND-01,
BC-PRIVACY-01, NFR-A11Y-01.

#### Scenario: Clean, tracker-free, accessible page
- **WHEN** the landing page is audited
- **THEN** it contains no emoji, exclamation points, off-palette hues, icon-library glyphs, or third-party tracker scripts
- **AND** each button and link has a visible focus indicator and an accessible name
