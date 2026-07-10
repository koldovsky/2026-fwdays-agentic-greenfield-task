# design-system (delta)

## ADDED Requirements

### Requirement: Fonts render Latin and Cyrillic on-brand
The display and body font tokens SHALL resolve to typefaces that include a
Cyrillic subset, so Ukrainian-first copy renders in the brand type rather than a
system fallback. The display token uses Unbounded and the body/sans tokens use
Golos Text, each loaded with the `latin` and `cyrillic` subsets via `next/font`.
The token names (`--font-display`, `--font-body`, `--font-sans`) are unchanged so
utilities (`font-display`, `font-body`) keep working. Implements NFR-I18N-01,
BC-BRAND-01; constrained by NFR-PERF-04.

#### Scenario: Ukrainian renders in the brand type
- **WHEN** the app renders Ukrainian (Cyrillic) copy
- **THEN** it uses the brand display/body faces, not a latin-only fallback
- **AND** `font-display` / `font-body` utilities resolve to the Cyrillic-capable faces

#### Scenario: Font token contract is preserved
- **WHEN** a component uses `font-display` or `font-body`
- **THEN** it resolves through the same `--font-display` / `--font-body` tokens
- **AND** the design-system token mirror (`docs/vouch-design-system`) matches the app values
