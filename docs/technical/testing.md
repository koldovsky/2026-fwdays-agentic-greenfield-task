# Testing — «Поливайко»

> Test layers, how to run them, and the CI ratchets. Evidence pack lives under
> [`../qa/`](../qa/). All figures below are read from the committed reports /
> baselines, not invented. Verified 2026-06-30 (Europe/Kiev).

## Layers

| Layer | Tool | Where | What it proves |
|---|---|---|---|
| Unit / component | Vitest + Testing Library | `*.test.ts(x)` beside source | pure rules (parsers, status math, series), `ActionResult` contract, component roles/variants |
| Integration (real SQLite) | Vitest + better-sqlite3 | [`tests/integration/`](../../tests/integration/) | lifecycle against a real DB incl. FK cascade |
| E2E | Playwright (chromium) | [`tests/e2e/`](../../tests/e2e/) | end-to-end flows in a browser |
| Evals | LLM-judge eval-suite | [`evals/`](../../evals/) → `evals/results/latest.json` | graded copy/error quality (the BAR) |
| Recordings + vision | Playwright recorder + judge | [`../qa/demo-recordings/`](../qa/demo-recordings/) | a human/judge sees the feature work |
| A11y | axe (`@axe-core/playwright`) | `scripts/check-a11y.mjs` | WCAG 2 A/AA incl. color-contrast |

### Unit / component

433 passing tests across 42 files (`npm run test:run`, verified 2026-06-30 11:00
Kiev). Load-bearing pure seams have positive + negative assertions:
`parseHeightCm` edge cases, `deriveStatus`/`urgencyKey` boundaries (Kiev
today/tomorrow, never-watered), `toGrowthSeries`/`toWateringSeries` (tie-break,
decimal preservation, same-day collapse, 365+ points no-cap), the
[`ActionResult`](../../lib/forms/result.ts) values-echo contract.

### Integration — real SQLite

5 suites in [`tests/integration/`](../../tests/integration/): `plants-lifecycle`,
`plants-persistence`, `growth-lifecycle`, `watering-lifecycle`, `reminders`. Each
runs against a fresh in-memory/temp SQLite DB (the `db` handle is injected per the
module pattern). The cascade is proven by a real FK probe, not a mock.

### E2E — Playwright

11 chromium tests across `plants.e2e.ts`, `tracking.e2e.ts`, `reminders.e2e.ts`,
`responsive.e2e.ts`. A deterministic seed helper sets up fixtures
([`tests/e2e/helpers`](../../tests/e2e/helpers), `tests/e2e/global-setup.ts`).

### Evals — the quality BAR

11 cases, **11 pass / 0 fail**; per-dimension error-clarity **89**,
usability-clarity **94**; pass mark 70/case, a CRITICAL rubric miss fails a case.
Per-case verdicts: [`../qa/eval-report.md`](../qa/eval-report.md). Recordings
*illustrate* a case; the **eval decides** it — cite the eval verdict.

### Recordings + vision

6 clips, all asserted real artifacts (≥10 000 B video + still + flow assertion):
[`../qa/recordings-report.md`](../qa/recordings-report.md),
[`../qa/demo-recordings/manifest.json`](../qa/demo-recordings/manifest.json). A
fresh judge confirmed **6/6 met + legible** by eyes-on-pixels:
[`../qa/vision-report.md`](../qa/vision-report.md). **One clip per viewport** —
1280×800 content clips + a separate 360×800 `responsive-360` clip (a mid-clip
resize would stretch frames). Each manifest entry lists the FR ids it proves
(the traceability validator reads them).

### A11y

`npm run check:a11y` (axe WCAG 2 A/AA incl. color-contrast) — **0
serious/critical** in the paper theme (NFR-A11Y-01/02/04). Three text tokens were
darkened to clear AA contrast ([`../design.md`](../design.md) AA-override note).

## How to run

```bash
npm run test:run          # all Vitest unit + component + integration
npm run test:integration  # integration only (real SQLite)
npm run test:e2e          # Playwright E2E (chromium)
npm run test:coverage     # coverage report
npm run check:a11y        # axe
npm run qa:verify         # the full QA aggregate
npm run gate:status       # gate G0–G8 verdicts
```

## Ratchets (CI guards — must not regress)

| Ratchet | Baseline | Guard |
|---|---|---|
| Coverage | lines **77.23** / stmts 78.16 / funcs 92.94 / branches 86.28 ([`quality/coverage-baseline.json`](../../quality/coverage-baseline.json)) | `npm run check:coverage` |
| Eval | error-clarity **89**, usability-clarity **94** ([`quality/eval-baseline.json`](../../quality/eval-baseline.json)) | `npm run check:eval` |
| Trajectory | 28/28 pass, ~93 all dimensions ([`../qa/trajectory-eval-report.md`](../qa/trajectory-eval-report.md)) | trajectory ratchet |
| Traceability | PASS, 0 failures ([`../qa/traceability-report.md`](../qa/traceability-report.md)) | `npm run check:trace` |
| Recordings | 6/6 asserted ([`../qa/recordings-report.md`](../qa/recordings-report.md)) | `npm run check:recordings` |

## Known testing limitations (honest)

- **Perf budgets** NFR-PERF-01/02 observed locally, **not** gated by a CI timer
  (risk R-05). The data-side no-cap guarantee (365+ points) is unit-asserted.
- **Cross-browser** verified on **chromium only**; manual Firefox/Safari/Edge
  spot-check is a Phase 7 release action (risk R-04, NFR-COMPAT-02).
- A few eval payloads use `inlineMessageFor*` keys instead of the spec'd
  `fieldErrors.*` shape — cosmetic, cases still pass (risk R-08).
