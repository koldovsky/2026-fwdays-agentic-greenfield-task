# QA Proof Pack — «Поливайко»

> Single-user local plant watering-reminder + growth/watering tracker with
> charts. «Поливайко» design system, single light "paper" theme, Ukrainian UI.
> Timezone for all dates: **Europe/Kiev**. Authored at **Phase 6** (QA proof),
> 2026-06-30.

This pack is committed **proof**. Every claim links to a real file, test run,
generated report, or recording clip. Where something cannot be verified yet,
it is stated plainly (see [`risk-register.md`](./risk-register.md)).

## What's in this pack

| Document | What it is |
|---|---|
| [`requirements-traceability-matrix.md`](./requirements-traceability-matrix.md) | Human-readable FR/NFR → spec → implementation → test(s) → evidence. Derived from the machine chain `trace/trace.json` + the code; not hand-faked. |
| [`manual-test-plan.md`](./manual-test-plan.md) | Numbered manual cases for core flows, executable by a non-developer in Chrome. |
| [`demo-script.md`](./demo-script.md) | The walkthrough narrative mapping to the 6 recorded clips. |
| [`risk-register.md`](./risk-register.md) | Known risks/limitations, mitigation, owner/status. |
| [`mvp-acceptance-report.md`](./mvp-acceptance-report.md) | Acceptance summary per capability + gate status G0–G6, ready for sign-off. |
| [`eval-report.md`](./eval-report.md) | **Generated** graded-quality bar (11/11 pass; error-clarity 89 / usability 94). The eval *decides* a graded case; recordings only *illustrate* it. |

## Generated artifacts (do not hand-edit — regenerate)

| Artifact | Generator | Guard |
|---|---|---|
| [`traceability-report.md`](./traceability-report.md) + `trace/trace.json` | `scripts/check-traceability.mjs` | CI `--check-fresh` |
| [`eval-report.md`](./eval-report.md) + `evals/results/latest.json` | eval-suite workflow | `scripts/check-eval-ratchet.mjs` vs `quality/eval-baseline.json` |
| [`recordings-report.md`](./recordings-report.md) + `demo-recordings/manifest.json` | `scripts/check-recordings.mjs` | recordings gate |
| [`vision-report.md`](./vision-report.md) | vision-verify workflow | judgment gate |
| [`trajectory-report.md`](./trajectory-report.md) | `scripts/check-trajectory.mjs` | CI |

## Recordings

Six clips under [`demo-recordings/`](./demo-recordings/), each `.webm` + settled
`.png` + `.md` explainer, indexed by `manifest.json`. **One clip per viewport**
(content clips at 1280×800; the responsive clip at 360×800) — the recorder
harness fixes the viewport per context and never resizes mid-clip, so frames are
never stretched. Each manifest entry lists the requirement ids it proves (read by
the traceability validator). See [`demo-script.md`](./demo-script.md).

## How to reproduce

Prereqs: Node + `npm ci`. SQLite is file-based (ADR-0001) — no DB server.

```bash
npm run test:run        # 433 unit + component tests (vitest)        -> all green
npm run test:integration  # 5 real-SQLite lifecycle/persistence suites
npm run test:e2e        # 11 Playwright e2e (chromium)               -> all green
npm run test:coverage   # coverage report (ratcheted, see below)
npm run db:seed         # seed a realistic demo dataset into the SQLite file
npm run db:migrate      # apply Drizzle migrations

# Gates / checks (each writes/refreshes a report under docs/qa/):
npm run check:trace        # regenerate traceability-report.md + trace/trace.json
npm run check:coverage     # coverage ratchet vs quality/coverage-baseline.json
npm run check:eval         # eval ratchet vs quality/eval-baseline.json
npm run check:trajectory   # process audit of the 7 archived slices
npm run check:recordings   # asserts each clip is a REAL artifact (bytes + shot + asserted)
npm run check:a11y         # axe-core (WCAG 2 A/AA incl. color-contrast) over routes
npm run qa:verify          # runs the whole validation battery (trace/trajectory/recordings/eval)
npm run gate:status        # deterministic G0–G8 summary
npm run qa:record-demos    # re-record the 6 demo clips (headless Playwright)
```

> Recordings and vision-verify are **judgment** gates: the artifacts are reviewed
> by a human/judge, not merely generated. A broken clip shipped to a customer is
> worse than no clip — `check:recordings` enforces real bytes; `vision-report.md`
> records the eyes-on-pixels verdict.
