# Kolo360 — UI kit

High-fidelity recreations of the core Kolo360 HR surfaces, built from the source prototype
(`Kolo360.dc.html`). These are visual references, not production code.

Screens:
- **`index.html`** — the **Report** (approval gate): the product's signature view. AI-drafted,
  editable serif prose, scale-dot scores, pull-quotes, a calibration-flags rail, and the
  sticky approve footer. This is the screen the whole product builds toward.
- **`cycles.html`** — the **Cycles list**: HR's home. Dense table of review cycles with
  status badges and response-progress bars.

Both link the design system's `styles.css` and reuse its foundations (paper neutrals, one
evergreen accent, Inter / Source Serif 4 / JetBrains Mono zoning, hairline borders, no
shadows on flat surfaces).

The full 7-screen interactive flow (cycles list → new cycle → cycle detail → analyze →
report → templates → template editor → respondent form) lives in the source prototype.
