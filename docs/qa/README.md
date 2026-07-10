# QA Proof Pack — Weather Explorer

Last updated: 2026-06-27

This folder holds the MVP acceptance evidence for the workshop delivery.
Automated gates read these artifacts; do not hand-edit generated reports
(`traceability-report.md`, `recordings-report.md`, `trajectory-report.md`).

## Contents

| Artifact | Purpose |
|---|---|
| [requirements-traceability-matrix.md](./requirements-traceability-matrix.md) | FR → capability → code → tests → manual case → recording |
| [manual-test-plan.md](./manual-test-plan.md) | Non-developer executable checks in Chrome |
| [demo-script.md](./demo-script.md) | Steps used by `scripts/record-demos.mjs` |
| [risk-register.md](./risk-register.md) | Residual risks and mitigations |
| [mvp-acceptance-report.md](./mvp-acceptance-report.md) | Customer-facing sign-off summary |
| [demo-recordings/manifest.json](./demo-recordings/manifest.json) | Recording index (`check-recordings`, traceability) |

## Regenerate evidence

```bash
npm run dev                                    # app at http://localhost:3000
npm run qa:record-demos                        # headless Playwright clips
node scripts/check-recordings.mjs              # video + asserted gate
node scripts/check-traceability.mjs --pre-commit
npm run qa:verify                              # full battery report
```

Recordings require `@playwright/test` and Chromium (`npx playwright install chromium`).

## Scope note

All nine MVP capability slices are archived under `openspec/changes/archive/`.
Output evals and full G6 vision/a11y passes are tracked separately in
`evals/` and optional workflow runs.
