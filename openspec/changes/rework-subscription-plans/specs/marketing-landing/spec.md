# marketing-landing (delta)

## MODIFIED Requirements

### Requirement: Pricing table shows four plans with structured benefits

The landing pricing table SHALL render four plan cards: Free, Pro ($12/mo),
Ultra ($30/mo), and Job-hunt Pass ($20 one-time, 14 days). Ultra SHALL be the
featured (visually prominent) card. Free SHALL be presented as a lightweight
descriptive row above the three paid cards rather than a full card, to draw
attention to paid plans without hiding the free tier. Each paid card SHALL
render its feature list as individual items sourced from
`landing.pricing.<plan>.features` (a `readonly string[]`). No feature list item
SHALL contain an emoji or exclamation point. Implements FR-SALES-03, BC-BRAND-01,
NFR-I18N-01.

#### Scenario: Four plans visible on the landing

- **WHEN** an anonymous visitor opens `/`
- **THEN** the pricing section contains plan headings for Free, Pro, Ultra, and
  Job-hunt Pass with their respective prices and benefit items

#### Scenario: Ultra is the featured plan

- **WHEN** the pricing section renders
- **THEN** the Ultra card carries the featured visual treatment (inverted
  background, primary CTA button) and no other card does

#### Scenario: Free renders as a lightweight row

- **WHEN** the pricing section renders
- **THEN** Free is shown as a row or compact block above the paid cards, not as
  a full card sharing equal visual weight with paid plans

#### Scenario: Benefit items are structured and scannable

- **WHEN** a paid plan card renders
- **THEN** each benefit appears as a separate list item, not as a single
  run-on sentence

#### Scenario: Brand compliance on pricing section

- **WHEN** the pricing section is audited
- **THEN** no plan name, benefit item, badge, or CTA label contains an emoji,
  exclamation point, or color outside the design-token palette (BC-BRAND-01)

#### Scenario: Ukrainian copy is visible by default

- **WHEN** a visitor with no locale cookie loads the pricing section
- **THEN** all plan names, prices, benefit items, and CTAs render in Ukrainian
  (NFR-I18N-01, BC-BRAND-01)
