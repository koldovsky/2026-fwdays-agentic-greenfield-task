# Vision Report (vision-verify stills)

Generated: 2026-07-04T01:11:00Z  
Stills: `docs/qa/vision-stills/` (captured by `node scripts/record-vision-stills.mjs`)  
Judge: vision-judge (maker≠checker)

## Summary

| Clip | Proves | Met | Readable | Notes |
|---|---|---|---|---|
| recommendations-home | FR-SCORE-02, FR-SCORE-03 | yes | yes | Cards show chance %, lo–hi band, and text category pills; shell disclaimer visible. |
| program-detail | FR-DETAIL-01, BC-HONESTY-01 | yes | yes | Breakdown, cutoff bars, advice, and «Діапазон невизначеності» in modal + honesty footer. |
| comparison-table | FR-COMPARE-01, NFR-A11Y-01 | yes | yes | Two-program table with text category labels and priority-1 advice. |

**Verdict: 3/3 clips met + readable.**

## Failures

None.

## Per-clip detail

### recommendations-home

- **Screenshot:** `docs/qa/vision-stills/recommendations-home.png`
- Program cards with traffic-light rings, uncertainty bands (e.g. «93–97 %»), and «НАДІЙНО» pills; global disclaimer in header region.

### program-detail

- **Screenshot:** `docs/qa/vision-stills/program-detail.png`
- Modal shows weighted breakdown → competitive total, three-year cutoff chart, category advice, explicit band line, and «не гарантія» disclaimer.

### comparison-table

- **Screenshot:** `docs/qa/vision-stills/comparison-table.png`
- Side-by-side metrics for two programs; chance rows pair % with text category; green advice names priority 1.
