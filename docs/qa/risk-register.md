# Risk Register — Weather Explorer MVP

Last updated: 2026-06-27

| ID | Risk | L | I | Mitigation | Status |
|---|---|---|---|---|---|
| R-01 | Open-Meteo or Nominatim rate limits during demo | M | M | Debounced search; shared forecast cache; calm inline errors | Accepted |
| R-02 | Map tiles blocked by corporate firewall | L | M | Forecast/search still work; map shows inline error | Accepted |
| R-03 | Leaflet + Tailwind CSS conflicts | L | H | Fixed in add-map (`globals.css` overrides) | Closed |
| R-04 | Comfort rationale contradicts weather | M | H | Pure scoring tests + eval rubric for rain tone | Mitigated |
| R-05 | Canvas background cost on low-end mobile | M | M | Particle cap 36; reduced-motion static fallback | Accepted |
| R-06 | Footer joke hash collision for nearby coords | L | L | Eight jokes; location+date seed | Accepted |
| R-07 | No production Lighthouse/p95 evidence yet | M | M | Mark NFR-PERF-01/02 pending live measurement | Open |
| R-08 | Recording drift if UI copy changes | M | M | Regenerate demos after i18n changes; manifest in CI | Open |

L = likelihood, I = impact.
