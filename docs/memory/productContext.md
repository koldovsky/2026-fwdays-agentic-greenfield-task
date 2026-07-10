# Product context

## Summary

Weather Explorer pairs a 7-day Open-Meteo forecast with per-day comfort scoring,
an interactive OSM map, and a calm animated sky background. The headline answer
is whether the **upcoming weekend** at a chosen place is worth going. Tone is
Ukrainian-first, calm, practical — no exclamation marks (`BC-BRAND-01`).

## Primary user scenarios

1. **Land and search** — hero with city combobox; no default city; geolocation
   only on explicit button (`BC-PRIVACY-02`).
2. **Read forecast + comfort** — seven day cards, 48 h chart, weekend strip
   with green/yellow/red comfort badges and Ukrainian rationale.
3. **Explore on map** — click map to set location; marker + popup; OSM attribution.
4. **Compare weekends** — pin up to 3 cities; Sat/Sun table with comfort per city.
5. **Feel the weather** — animated background reflects condition; respects
   `prefers-reduced-motion`.

## UX / domain constraints

- External API failures: calm inline degradation, never blank screen or generic error page.
- Comfort rationale must not contradict weather (never «приємно» in rain).
- Console silent on healthy session (`NFR-OBS-01`).
- No trackers, no application cookies (`BC-PRIVACY-*`).

## Vocabulary

| Term | Meaning |
|------|---------|
| Active location | Currently selected lat/lon/name; synced to URL `?lat=&lon=&name=` |
| Comfort score | 0–100 pure function from feels-like, precip, wind, cloud, UV |
| Weekend strip | Sat+Sun average comfort — headline trip decision |
| Slice | One OpenSpec capability change in Project Factory (e.g. `add-map`) |
| Gate | Quality checkpoint G0–G8 in `checklists/quality-gates.md` |

## Pointers

- Full narrative: `docs/product-brief.md`
- Numbered requirements: `docs/requirements.md`
- Design tokens: `DESIGN.md`
