## MODIFIED Requirements

### Requirement: FR-TPL-05 Self-contained HTML
The output SHALL be self-contained HTML with embedded CSS and A4 print styles preserved from the template. The output SHALL contain no external network reference of any kind: web fonts SHALL be embedded as `data:font/woff2;base64,…` sources inside `@font-face` rules, with each subset's `unicode-range` preserved. Rendering the same invoice offline, in the browser preview, and in headless Chromium SHALL produce visually identical documents.

#### Scenario: Preview in browser
- **WHEN** the user opens HTML preview
- **THEN** styles render without any external network dependency, using the embedded fonts

#### Scenario: Offline rendering
- **WHEN** the rendered HTML is opened with no network available (a saved file, or headless Chromium for PDF)
- **THEN** the document renders with the same typeface and weights as the online preview, and no request leaves the machine

#### Scenario: Numero sign in an English-only invoice
- **WHEN** an invoice with only Latin text is rendered, and its payment purpose contains `№` (U+2116, FR-CALC-06)
- **THEN** the glyph renders from the embedded Cyrillic subset, which owns that code point

#### Scenario: Real weights, no synthesis
- **WHEN** the document uses `font-weight: 800` for the invoice title
- **THEN** the weight resolves to a real instance of the embedded variable font rather than a synthesised bold
