# marketing-landing (delta)

## ADDED Requirements

### Requirement: Landing copy is localized through shared/lib/i18n
All user-visible landing copy SHALL resolve through the `shared/lib/i18n`
dictionary in both `ua` and `en`, with structural parity between the two locales.
No landing UI string SHALL be hardcoded in a `views/landing` component or in
`content.ts`; non-translatable structural data (checklist status, grounding,
accent, price, feature ordering, hrefs) MAY remain local. Until the display fonts
gain a Cyrillic subset (task 10), the landing SHALL render with an explicit `en`
locale rather than the `ua` default. Implements NFR-I18N-01, BC-BRAND-01.

#### Scenario: Landing strings come from the dictionary
- **WHEN** the landing page renders any section (hero, pillars, before/after, checklist, how-it-works, pricing, FAQ, final CTA, footer)
- **THEN** its visible copy is read from `shared/lib/i18n` for the active locale
- **AND** the `ua` and `en` dictionaries have identical key sets for the landing block

#### Scenario: Rendered locale is pinned to English until Cyrillic fonts land
- **WHEN** the landing page is rendered today
- **THEN** it resolves copy with an explicit `en` locale, not the `ua` fallback default
- **AND** no landing component reads a hardcoded UI string

#### Scenario: Localized copy stays on-brand
- **WHEN** the landing dictionary values are audited
- **THEN** they contain no emoji, no exclamation points, and no em-dashes (BC-BRAND-01)
