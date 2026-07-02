# ForgeFlow Output Eval Report

- Generated: 2026-07-02T14:18:41Z
- Cases: 6 (6 pass, 0 fail)
- Threshold: 70/100
- Dimensions: decision-clarity 95, error-clarity 95, status-clarity 95
- Review mode: **retrospective self-assessment**
- Independent judge: **no**

The placeholder sample was replaced with executable ForgeFlow cases. `tests/evals.test.ts` calls every producer against current domain logic and locks the exact outputs used by these rubrics.

| Case | Dimension | Trace | Score | Result |
|---|---|---|---:|---|
| eval-procurement-excess-receipt | error-clarity | FR-21, NFR-3, NFR-7 | 95 | pass |
| eval-procurement-invalid-reference | error-clarity | FR-18, FR-39, NFR-3 | 95 | pass |
| eval-manufacturing-quality-hold | decision-clarity | FR-31, FR-34, NFR-3, NFR-7 | 95 | pass |
| eval-manufacturing-shortage | decision-clarity | FR-31, FR-34, NFR-3 | 95 | pass |
| eval-dashboard-critical-stock-label | status-clarity | FR-11, FR-12, NFR-7, NFR-10 | 95 | pass |
| eval-master-data-invalid-rating | error-clarity | FR-14, NFR-3, NFR-7 | 95 | pass |

## Limitation

This establishes a real, non-skipping deterministic ratchet baseline, but the qualitative scores were assigned in the implementation session. It must not be represented as maker≠checker evidence. A future run of `.claude/workflows/eval-suite.js` with a fresh eval judge should replace these three artifacts.
