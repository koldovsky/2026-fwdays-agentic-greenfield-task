# Gate Report (G5)

Generated: 2026-07-08 · Command: `dotnet run scripts/check-gate-status.cs`

## Summary

| Gate | Status |
| --- | --- |
| **G5** | **PASS** |
| MVP slices | 6/6 complete |
| Ratchets | locked (no baseline pending) |

## G5 Detail

| Gate | Status | Detail |
| --- | --- | --- |
| G0 scaffold | green | required harness files present |
| Output eval baseline | locked | baseline **90.0% (36/40)** @ threshold 0.5 |
| Output eval observed | green | **90.0% (36/40)** |
| Coverage baseline | locked | Core line-rate **76.2%** |
| Coverage observed | green | **76.2%** |
| Slice verdicts | green | 6 verdict files present |

## Unit & Eval Test Counts

| Project | Passed |
| --- | ---: |
| `TrafficSignScanner.Core.Tests` | 31 |
| `TrafficSignScanner.App.Tests` | 4 |
| `TrafficSignScanner.Mcp.Tests` | 9 |
| `TrafficSignScanner.Evals` | 6 |
| **Total** | **50** |

## Gate Scripts (all green)

| Script | Purpose |
| --- | --- |
| `scripts/check-traceability.cs` | FR IDs cited in OpenSpec |
| `scripts/check-eval-ratchet.cs` | output eval pass rate ≥ baseline |
| `scripts/check-coverage-ratchet.cs` | Core line coverage ≥ baseline |
| `scripts/check-gate-status.cs` | G5 report + artifact presence |

## Enforcement

- **Pre-commit** (`.githooks/pre-commit.ps1`): format, build, tests with coverage, eval harness, ratchets, gate status.
- **CI** (`.github/workflows/ci.yml`): same gate sequence on push/PR.

## Slice Gates

| Slice | Gate | Verdict |
| --- | --- | --- |
| `core-preprocessing` | G4.1 | [pass-with-risks](verdicts/core-preprocessing.md) |
| `core-inference` | G4.2 | [pass-with-risks](verdicts/core-inference.md) |
| `core-overlay` | G4.3 | [pass](verdicts/core-overlay.md) |
| `app-ui` | G4.4 | [pass](verdicts/app-ui.md) |
| `mcp-server` | G4.5 | [pass](verdicts/mcp-server.md) |
| `evals-hardening` | G5 | [pass](verdicts/evals-hardening.md) |
