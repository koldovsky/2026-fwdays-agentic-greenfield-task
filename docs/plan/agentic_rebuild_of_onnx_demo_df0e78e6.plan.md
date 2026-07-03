---
name: Agentic rebuild of ONNX demo
overview: Prepare a fork of koldovsky's homework repo as a fully-harnessed agentic environment (context, specs, sub-agents, gates, hooks, evals), then let agents rebuild the MAUI + ONNX traffic-sign detector from scratch through spec-driven, test-first loops — demonstrating the course's practices end to end.
todos:
  - id: phase0-manual
    content: "You: fork homework repo, branch, MAUI template at src/TrafficSignScanner.App, add model.onnx/labels.txt/eval photos, copy Ortinau skills, enable CodeRabbit, open fork in Cursor with this plan copied to docs/plan/"
    status: pending
  - id: static-context
    content: Create AGENTS.md (thin contract + loop protocol), CLAUDE.md pointer, .cursor/rules/*.mdc, .cursor/mcp.json with Context7
    status: pending
  - id: intent-docs
    content: Write docs/product-brief.md, docs/requirements.md (stable FR/NFR/TC/BC IDs), docs/model-contract.md, DESIGN.md, ADRs 0001-0004, docs/current-state.md
    status: pending
  - id: openspec-skill
    content: Init openspec/, author custom-vision-onnx skill, write docs/mvp-capability-plan.md with slice DAG (G1-G3 sign-offs)
    status: pending
  - id: verification-machinery
    content: Scaffold Core/Tests/Evals/Mcp projects, scripts/check-*.cs file-based C# gates, .githooks (pre-commit, commit-msg trailers), GitHub Actions CI (G0)
    status: pending
  - id: agents-routing
    content: Write docs/agents/ sub-agent role definitions (4 makers, 4 checkers) + routing.md with model tiers and handoffs
    status: pending
  - id: slice-core
    content: Run slice loop for core-preprocessing, core-inference, core-overlay (spec, red tests, green impl, gates, adversarial review, judge verdict, archive)
    status: pending
  - id: slice-app-mcp
    content: Run slice loop for app-ui (MVVM over Core) and mcp-server (detect_objects tool, register in .cursor/mcp.json)
    status: pending
  - id: evals-hardening
    content: Build output-eval dataset expected.json, lock eval + coverage ratchet baselines, full gate report green (G5)
    status: pending
  - id: submit
    content: Generate qa/ proof pack + traceability matrix, rewrite README, you record 1-2 min video, open PR with template, iterate on CodeRabbit
    status: pending
isProject: false
---

# Agentic Rebuild: MAUI ONNX Sign Detector via Course Workflow

## Goal

Rebuild the existing MAUI + ONNX object-detection demo **from scratch** inside a fork of [koldovsky/2026-fwdays-agentic-greenfield-task](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task), where the deliverable is not the app itself but the **agentic engineering process**: context engineering, loops, verification (tests + evals), maker ≠ checker, traceability. The current repo (`D:\Projects_test\Maui-Onnx-ObjectDetection-Demo`) stays untouched and serves as the reference for domain knowledge (gotchas, docs, eval images).

Deliberately skipped: Project Factory plugin (token cost), GenUI (web-only), emulator UI automation (verification happens via Core tests, evals, MCP surface, and the manual demo video).

## Phase 0 — Manual prerequisites (you, not the agent)

1. Fork + clone the homework repo; create the work branch `serhiy-pop/traffic-sign-scanner`. Enable CodeRabbit on the fork.
2. `dotnet new maui` template project at `src/TrafficTrafficSignScanner.App/` (project name: `traffic-sign-scanner`, .NET namespaces/projects use `TrafficTrafficSignScanner.*`).
3. Copy in the model assets: `model.onnx`, `labels.txt` (into `Resources/Raw/`), and the eval photos into `evals/dataset/<label>/` — one folder per class named exactly as in `labels.txt` (`stop-sign/`, `no-entry/`, `parking-prohibited/`) plus `negative/` (no target sign, incl. other red signs). 10–15 images per class + 8–10 negatives, kebab-case names `<label>-NN.jpg`, max side ~1600px. Prefer photos not used for Custom Vision training where possible. Agents will generate `expected.json` beside them (folder = expected label; `negative/` = zero detections).
4. Copy the selected Ortinau skills (folders with `SKILL.md`) from [davidortinau/maui-skills](https://github.com/davidortinau/maui-skills) into `.claude/skills/`: `maui-current-apis` (always-on API guardrail), `maui-media-picker`, `maui-file-handling`, `maui-permissions`, `maui-data-binding`, `maui-dependency-injection`, `maui-shell-navigation`, `maui-unit-testing`, `maui-app-lifecycle`, `maui-performance`.
5. Open the fork as a new Cursor workspace; copy this plan into the repo as `docs/plan/bootstrap-plan.md` ("the agent forgets; the repo doesn't").

## Phase 1 — Static context (thin, versioned)

Everything the agent must always know — kept short per the course's static-context rule:

- `AGENTS.md` — compiler-grade contract (~100 lines): stack (`net10.0` MAUI, C#, xUnit), architecture boundaries as hard rules (`TrafficSignScanner.Core` MUST NOT reference MAUI/`Microsoft.Maui.*`; UI logic only in App; MCP server only wraps Core), the loop protocol (below), commit trailer requirement, negative-before-positive rules ("NEVER weaken a failing test", "NEVER commit without green gates", "NEVER invent model input names — read `docs/model-contract.md`"), DO-NOT-TOUCH zones (`evals/baselines/`, `Resources/Raw/model.onnx`).
- `CLAUDE.md` — one line: pointer to `AGENTS.md` (portability).
- `.cursor/rules/*.mdc` — small scoped rules: `core-purity.mdc` (glob `src/TrafficSignScanner.Core/**`), `mvvm.mdc` (glob `src/TrafficSignScanner.App/**` — no code-behind logic, CommunityToolkit.Mvvm, async/await discipline), `tests-first.mdc`, `openspec-workflow.mdc`.
- `.cursor/mcp.json` — Context7 MCP (fresh .NET/MAUI docs) + later the project's own TrafficSignScanner MCP server.

## Phase 2 — Dynamic context: intent, requirements, design

- `docs/product-brief.md` — narrative: offline edge-AI traffic-sign detector, why local inference (privacy/latency/no keys), sourced from the old README.
- `docs/requirements.md` — **the PRD**, single source of truth with stable IDs (`FR-CAPTURE-01`, `FR-PICK-01`, `FR-PREPROC-01..03`, `FR-DETECT-01..03`, `FR-OVERLAY-01..02`, `FR-MCP-01..02`, `NFR-PERF-01` inference off UI thread, `NFR-STARTUP-01` lazy model init, `TC-STACK-01` net10 MAUI, `TC-MODEL-01` Custom Vision compact ONNX contract, `BC-OFFLINE-01` no network calls). Statuses `proposed/accepted/shipped`.
- `docs/model-contract.md` — the hard-won domain knowledge distilled from the old `docs/maui-integration.md`: input `image_tensor float32[1,3,320,320]` NCHW, **raw 0–255 (no normalization — model subtracts 127.5 internally)**, outputs `detected_boxes/classes/scores`, 0-based class ids, center-crop-then-resize. This is the anti-hallucination anchor.
- `DESIGN.md` — architecture decisions + why .NET is AI-friendly here (strong types = machine-checkable gates; residual risk = post-cutoff MAUI 10 APIs, mitigated by `maui-current-apis` skill + Context7).
- `docs/adr/` — ADR-0001 pure-core split, ADR-0002 raw-pixel tensor (intent record for the #1 gotcha), ADR-0003 sub-agent judge instead of API-key eval harness, ADR-0004 MCP as desktop verification surface.
- `docs/current-state.md` — session handoff: current gate, done slices, next slice.
- `openspec/` — `npx @fission-ai/openspec init`; one spec per capability, GIVEN/WHEN/THEN scenarios citing FR IDs; `openspec validate --all --strict` as a gate. (The only Node tool we keep — it's the course's SDD standard; everything custom stays .NET.)
- Custom skill `.claude/skills/custom-vision-onnx/SKILL.md` — procedural how-to for this model family (Netron inspection, tensor gotchas, class-id mapping, AppData copy for InferenceSession).

## Phase 3 — Solution skeleton + verification machinery

Solution layout (agents create everything except the App template):

- `src/TrafficSignScanner.Core/` — pure classlib: preprocessing (EXIF-oriented decode, center-crop, resize — SkiaSharp only), tensor creation, `IDetector` + ONNX session wrapper, output parsing/thresholding, overlay geometry. All public logic carries `@trace FR-*` doc comments.
- `src/TrafficSignScanner.App/` — MAUI head: MVVM page (capture/pick → Core → annotated preview + results).
- `src/TrafficSignScanner.Mcp/` — stdio MCP server on the official [ModelContextProtocol C# SDK](https://github.com/modelcontextprotocol/csharp-sdk): tools `detect_objects(imagePath)` and `get_model_info()` wrapping Core. Registered in `.cursor/mcp.json` → Cursor can call the app's brain directly (demo-video highlight).
- `tests/TrafficSignScanner.Core.Tests/` — xUnit deterministic gates (tensor layout NCHW, raw-255 values, crop math, parse/threshold/class-map incl. 1-based edge case, box conversion).
- `evals/TrafficSignScanner.Evals/` — **output evals**: xUnit-hosted runner executing real `model.onnx` on `evals/dataset/` (expected labels in `expected.json`); pass = expected sign detected ≥ 0.5 confidence, negatives produce nothing; aggregate pass-rate compared to `evals/baselines/output-eval.json` (ratchet: may only rise).
- `scripts/*.cs` — **.NET 10 file-based C# scripts** (`dotnet run scripts/check-traceability.cs`), exit-code gates:
  - `check-traceability.cs` — walks FR → spec citation → `@trace` in code/tests → `Refs:` in git log; orphans/gaps = exit 1.
  - `check-eval-ratchet.cs` — eval pass-rate vs baseline.
  - `check-coverage-ratchet.cs` — Core line coverage (coverlet) vs baseline.
  - `check-gate-status.cs` — aggregates all checks + verdict files into a gate report.
- `.githooks/` (`core.hooksPath`, PowerShell): `pre-commit` (`dotnet format --verify-no-changes`, build, Core tests, simple secret regex scan), `commit-msg` (commits touching `src|tests|evals` must carry `Refs: FR-*` or `Slice: <name>` trailer). `setup.ps1` wires them.
- `.github/workflows/ci.yml` — windows-latest: build Core+Mcp+tests, run tests, run evals, run all `check-*` scripts, gitleaks action; separate job installs the maui workload and compile-checks the App.

## Phase 4 — Orchestration: sub-agents, routing, the loop

`docs/agents/` role definitions (used as Cursor sub-agent prompts) + `docs/agents/routing.md`:

- Makers: `requirements-analyst`, `spec-writer`, `test-engineer` (writes red tests from spec **before** implementation), `capability-implementer`.
- Checkers (maker ≠ checker, structurally — fresh context, never reviews own slice): `code-reviewer`, `security-reviewer`, `spec-compliance-auditor`, `eval-judge`.
- Model routing: frontier/high-thinking for architecture, spec writing, adversarial review; mid-tier for implementation of well-specified slices; cheap/fast for mechanical work (formatting, doc updates, boilerplate). Handoffs documented per role (what artifact each consumes/produces).
- **Trajectory eval** (per ADR-0003, no API keys): deterministic half in `check-traceability.cs` + git-log analysis; judgment half = `eval-judge` sub-agent reviewing the slice's commit sequence and diffs against a rubric (test-first order? no weakened assertions? no scope drift beyond the slice's module?), writing `qa/verdicts/<slice>.md`; `check-gate-status.cs` requires a fresh verdict per slice.

**The slice loop** (encoded in `AGENTS.md`, the agent iterates it autonomously):

```
read current-state.md → pick next slice from mvp-capability-plan.md
→ spec-writer: openspec change (proposal + spec deltas + tasks)
→ test-engineer: red tests (@trace FR-*)  → confirm red
→ capability-implementer: green (never weakening tests)
→ gates: format · build · test · evals · openspec validate --strict · check-* scripts
→ checker sub-agents: review-gate (adversarial) + eval-judge verdict
→ archive openspec change · update current-state.md · commit with Refs:/Slice: trailer
```

`docs/mvp-capability-plan.md` — slice table + mermaid DAG, one owner per FR, no gaps/dupes:
1. `core-preprocessing` (FR-PREPROC) → 2. `core-inference` (FR-DETECT) → 3. `core-overlay` (FR-OVERLAY) → 4. `app-ui` (FR-CAPTURE/PICK, NFR-*) → 5. `mcp-server` (FR-MCP) → 6. `evals-hardening` (dataset + ratchet baselines).

Simplified gates: **G0** harness ready (Phases 1–3 scaffolding green in CI) · **G1** requirements signed by you · **G2** specs validate strict · **G3** capability plan approved · **G4×6** slice loop per slice · **G5** ratchets locked + full gate report green · **G6** proof + submission. Human checkpoints: G1, G3, and final PR review.

## Phase 5 — Proof + submission (G6)

- `qa/` proof pack: gate report, traceability matrix (generated, not handwritten), eval report, verdicts.
- README rewritten to present both the product and the harness (map of artifacts → course practices).
- Record the 1–2 min video: app detecting a sign on device/emulator + Cursor calling the MCP `detect_objects` tool + a 30-second tour of the loop artifacts.
- Open the PR against the homework repo using its template (name, project, video link, applied-practices list: context engineering, SDD/OpenSpec, loops, tests+output/trajectory evals, maker≠checker sub-agents, model routing, hooks/guardrails, traceability, Context7+own MCP, skills). Iterate on CodeRabbit feedback (its comments feed back through the same slice loop).

## What you decide vs. what agents do

- You: Phase 0, sign-off at G1/G3, record video, submit PR.
- Agents: everything in Phases 1–5 within the loop, including writing their own harness first (G0) so later slices run with full guardrails.