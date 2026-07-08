# Traffic Sign Scanner

Offline .NET 10 MAUI app that detects three traffic-sign classes (`no-entry`, `parking-prohibited`, `stop-sign`) using a bundled Azure Custom Vision compact ONNX model. Built as homework for **fwdays Academy · Agentic Engineering: Greenfield** — the product is small on purpose; the engineering process is the deliverable.

**Gate status:** G5 green · MVP complete · [Proof pack](qa/README.md) ready for submission review.

## Product

| Layer | Project | Role |
| --- | --- | --- |
| UI | `src/TrafficSignScanner.App` | MAUI MVVM — camera capture, gallery pick, annotated preview |
| Core | `src/TrafficSignScanner.Core` | Preprocessing, ONNX inference, overlay geometry (no MAUI refs) |
| MCP | `src/TrafficSignScanner.Mcp` | Stdio MCP server for Cursor agent verification |
| Tests | `tests/*` | 44 deterministic unit tests |
| Evals | `evals/TrafficSignScanner.Evals` | Real-model output eval + ratchets (90.0% pass rate) |

### Run the app (Windows)

```powershell
dotnet build src/TrafficSignScanner.App/TrafficSignScanner.csproj -f net10.0-windows10.0.19041.0
dotnet run --project src/TrafficSignScanner.App/TrafficSignScanner.csproj -f net10.0-windows10.0.19041.0
```

Pick or capture an image; the app runs detection off the UI thread and shows boxes with label + confidence.

### Supported classes

From `src/TrafficSignScanner.App/Resources/Raw/labels.txt`: `no-entry`, `parking-prohibited`, `stop-sign`.

Model contract: [docs/model-contract.md](docs/model-contract.md) — input `image_tensor` `float32[1,3,320,320]`, raw RGB 0..255, center-crop + resize to 320×320.

---

## Harness map → course practices

This repo demonstrates **agentic engineering**, not just app delivery. Artifacts map to course practices as follows:

| Course practice | Repository artifact |
| --- | --- |
| **Context engineering** | [`AGENTS.md`](AGENTS.md) agent contract; [`.cursor/rules/`](.cursor/rules/) (tests-first); [`.claude/skills/`](.claude/skills/) MAUI + Custom Vision skills; [`docs/agents/routing.md`](docs/agents/routing.md) sub-agent routing |
| **SDD / specs first** | [`docs/requirements.md`](docs/requirements.md) FR/NFR IDs → [`openspec/specs/`](openspec/specs/) GIVEN/WHEN/THEN scenarios; slice changes archived under `openspec/changes/archive/` |
| **Loop engineering** | Slice loop G4.1–G5 per [`docs/mvp-capability-plan.md`](docs/mvp-capability-plan.md): spec → red tests → implement → gates → checker verdict → archive |
| **Verification (tests + evals)** | 50 tests across Core/App/MCP; real-model evals in [`evals/dataset/`](evals/dataset/); locked baselines in [`evals/baselines/`](evals/baselines/) |
| **Maker ≠ checker** | Implementer agent vs checker sub-agents; verdicts in [`qa/verdicts/`](qa/verdicts/) |
| **Traceability** | `@trace FR-*` on Core/tests; [`scripts/check-traceability.cs`](scripts/check-traceability.cs); generated [`qa/traceability-matrix.md`](qa/traceability-matrix.md) |
| **Hooks / guardrails** | [`.githooks/pre-commit.ps1`](.githooks/pre-commit.ps1) — format, build, tests+coverage, evals, ratchets; [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| **Ratchets** | [`scripts/check-eval-ratchet.cs`](scripts/check-eval-ratchet.cs) (90% output eval); [`scripts/check-coverage-ratchet.cs`](scripts/check-coverage-ratchet.cs) (76.2% Core lines) |
| **MCP tooling** | Custom server in [`.cursor/mcp.json`](.cursor/mcp.json) (`traffic-sign-scanner`); Context7 plugin for library docs |
| **Human checkpoints** | G1 requirements sign-off · G3 capability plan · G6 video + PR (you) |

### Proof pack (G6)

| Report | Path |
| --- | --- |
| Gate report | [`qa/gate-report.md`](qa/gate-report.md) |
| Traceability matrix | [`qa/traceability-matrix.md`](qa/traceability-matrix.md) |
| Eval report | [`qa/eval-report.md`](qa/eval-report.md) |
| Submission checklist | [`qa/submission-checklist.md`](qa/submission-checklist.md) |
| Slice verdicts | [`qa/verdicts/`](qa/verdicts/) |

Regenerate traceability: `dotnet run scripts/generate-traceability-matrix.cs`

---

## MCP server (Cursor)

Stdio MCP server for offline Core detection verification from Cursor.

### Prerequisites

- .NET 10 SDK
- Bundled model at `src/TrafficSignScanner.App/Resources/Raw/model.onnx`
- Cursor MCP config in `.cursor/mcp.json` (server name: `traffic-sign-scanner`, `"cwd": "."`)

Reload MCP servers after pulling (**Settings → MCP → Refresh**).

### Tools

| Tool | Purpose |
| --- | --- |
| `detect_objects(imagePath)` | Run the same Core detector pipeline as the MAUI app on a local image file |
| `get_model_info()` | Return ONNX input/output names, tensor shape, labels, and confidence threshold |

### Example

Ask Cursor to call `detect_objects` with a repo-relative eval image, e.g. `evals/dataset/stop-sign/stop-sign-01.jpg`, or the full Windows path.

Only local files with extensions `.jpg`, `.jpeg`, `.png`, `.webp`, or `.bmp` are accepted. Invalid paths return a structured MCP error **before** inference runs.

---

## Homework submission

This fork is the homework deliverable. **Do not open the PR until the demo video is recorded.**

1. Follow [`qa/submission-checklist.md`](qa/submission-checklist.md)
2. Record 1–2 min video: app detection + MCP tool call + brief harness tour
3. Open PR using [`.github/pull_request_template.md`](.github/pull_request_template.md) — fill **name**, **video link**, **practices list**
4. Iterate on CodeRabbit feedback; submit PR link in the course channel

Original course instructions (Ukrainian): see assignment sections in git history or the upstream fork template.

---

## Quick gate run

```powershell
dotnet format --verify-no-changes
dotnet test tests/TrafficSignScanner.Core.Tests/TrafficSignScanner.Core.Tests.csproj `
  --collect:"XPlat Code Coverage" `
  --results-directory tests/TrafficSignScanner.Core.Tests/TestResults/coverage
dotnet test tests/TrafficSignScanner.App.Tests/TrafficSignScanner.App.Tests.csproj
dotnet test tests/TrafficSignScanner.Mcp.Tests/TrafficSignScanner.Mcp.Tests.csproj
dotnet test evals/TrafficSignScanner.Evals/TrafficSignScanner.Evals.csproj
dotnet run scripts/check-eval-ratchet.cs
dotnet run scripts/check-coverage-ratchet.cs
dotnet run scripts/check-gate-status.cs
```

Expected: **90.0% (36/40)** eval pass rate · **76.2%** Core line coverage · **G5 gate report: PASS**
