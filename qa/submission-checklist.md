# Homework Submission Checklist

Use this before opening the Pull Request against the course repo. **Do not open the PR until the demo video is recorded.**

## Before You Open the PR

- [ ] **Record demo video (1–2 min)** — see [Video script](#demo-video-script) below
- [ ] Upload video (YouTube / Loom / Google Drive) and copy the link
- [ ] Review [qa/README.md](README.md) — gate report, traceability, eval report, verdicts
- [ ] Run gates locally one last time:

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

## PR Template Fields

Fill `.github/pull_request_template.md` with:

### 1. Author name

```
<!-- Your real name -->
Ім'я: ___________________________
```

### 2. Project (1–2 sentences)

Example:

> Offline .NET 10 MAUI app that detects three traffic-sign classes using a bundled Azure Custom Vision ONNX model. Includes deterministic Core tests, real-model output evals with ratchets, and a Cursor MCP server for agent verification.

### 3. Demo video link

```
Video: https://...
```

### 4. Applied Agentic Engineering practices

Copy or adapt from the table in [README — Harness map](../README.md#harness-map-course-practices). Minimum topics to mention:

| Practice | What we did |
| --- | --- |
| Context engineering | `AGENTS.md`, `.cursor/rules/`, MAUI/CV skills, `docs/agents/routing.md` |
| SDD / OpenSpec | Requirements → OpenSpec specs → slice changes → archive |
| Loop engineering | Slice loop G4.1–G5: spec → red tests → implement → gates → checker → verdict |
| Verification | 50 unit tests + 6 eval tests; eval/coverage ratchets in pre-commit/CI |
| Maker ≠ checker | Separate verdicts in `qa/verdicts/`; Bugbot/security-review sub-agents |
| Traceability | `@trace FR-*` in code/tests; generated `qa/traceability-matrix.md` |
| Hooks / guardrails | `.githooks/pre-commit.ps1`, `scripts/check-*.cs`, CI workflow |
| MCP | Custom `traffic-sign-scanner` stdio server + Context7 for library docs |
| Human checkpoints | G1 requirements, G3 capability plan, G6 video + PR review |

Also note **what you decided** vs **what agents implemented** (e.g. you approved slices and recorded video; agents wrote specs, tests, and code within the contract).

## PR Checklist (from template)

- [ ] Real name filled in
- [ ] Video link added (1–2 min)
- [ ] Agentic practices described concretely
- [ ] Result is working end-to-end (app + MCP + green gates)

## Demo Video Script

Suggested flow (~90 seconds):

1. **Product (30 s)** — MAUI app: pick/capture image → detect → annotated preview with label + confidence.
2. **MCP (30 s)** — Cursor: call `detect_objects` on `evals/dataset/stop-sign/stop-sign-01.jpg`; show `get_model_info`.
3. **Harness (30 s)** — Quick tour: `docs/current-state.md` (G5 green), `qa/gate-report.md`, one verdict, `openspec/specs/`, pre-commit or CI mention.

## After Opening the PR

- [ ] Enable / confirm **CodeRabbit** on your fork
- [ ] Read CodeRabbit feedback; iterate if needed
- [ ] Submit PR link in the course channel

## Status

| Item | Status |
| --- | --- |
| G5 gate | green |
| Proof pack | ready in `qa/` |
| Video | **pending — record before PR** |
| PR | **not opened — awaiting your review** |
