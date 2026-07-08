# QA Proof Pack (G6)

Proof artifacts for the **Traffic Sign Scanner** agentic rebuild. Gate **G5 green**; this pack supports homework submission review before opening the PR.

## Contents

| Artifact | Description |
| --- | --- |
| [gate-report.md](gate-report.md) | G5 gate status, test counts, enforcement map |
| [traceability-matrix.md](traceability-matrix.md) | Generated FR/NFR/TC/BC → spec → tests → slice → verdict |
| [eval-report.md](eval-report.md) | Output eval pass rate, failures, coverage ratchet |
| [submission-checklist.md](submission-checklist.md) | Homework PR checklist (name, video, practices) |
| [verdicts/](verdicts/) | Per-slice checker verdicts (maker ≠ checker) |

## Slice Verdicts

| Slice | Gate | Verdict |
| --- | --- | --- |
| [core-preprocessing](verdicts/core-preprocessing.md) | G4.1 | pass-with-risks |
| [core-inference](verdicts/core-inference.md) | G4.2 | pass-with-risks |
| [core-overlay](verdicts/core-overlay.md) | G4.3 | pass |
| [app-ui](verdicts/app-ui.md) | G4.4 | pass |
| [mcp-server](verdicts/mcp-server.md) | G4.5 | pass |
| [evals-hardening](verdicts/evals-hardening.md) | G5 | pass |

## Regenerate

```powershell
dotnet run scripts/check-gate-status.cs          # refresh gate-report numbers manually if needed
dotnet run scripts/generate-traceability-matrix.cs
dotnet test evals/TrafficSignScanner.Evals/TrafficSignScanner.Evals.csproj `
  --filter "FullyQualifiedName~Output_eval" --logger "console;verbosity=detailed"
```

Update `gate-report.md` and `eval-report.md` after regenerating if metrics change.
