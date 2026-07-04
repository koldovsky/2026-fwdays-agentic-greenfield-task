# Current State

## Gate

Current gate: G0 green; awaiting G3 review.

Phase 0 manual prerequisites are complete per user confirmation. G1 requirements review passed on 2026-07-03.

## Completed Context

- Static agent contract: `AGENTS.md`.
- Portability pointer: `CLAUDE.md`.
- Cursor rules for Core purity, MAUI MVVM, tests-first behavior, and OpenSpec workflow.
- Context7 MCP registration.
- Product brief and stable PRD IDs.
- Model contract distilled from the copied MAUI integration and training docs.
- Design note and ADRs 0001-0004.
- OpenSpec initialized with the `spec-driven` schema.
- Custom `custom-vision-onnx` skill authored under `.claude/skills/`.
- MAUI app moved to `src/TrafficSignScanner.App`.
- Root solution and scaffold projects created for Core, MCP, Core tests, and evals.
- File-based C# gate scripts created under `scripts/`.
- Git hooks and GitHub Actions CI scaffolded.
- Sub-agent role definitions and routing created under `docs/agents/`.
- MVP capability plan created at `docs/mvp-capability-plan.md`.
- G0 validation passed locally: harness build/test, MAUI Windows compile, OpenSpec strict validation, check scripts, and hook smoke checks.

## Pending Human Review

- G3: approve or revise `docs/mvp-capability-plan.md` after Phase 3/4 scaffolding is green.

## Scaffolded Projects

- `src/TrafficSignScanner.Core`
- `src/TrafficSignScanner.App`
- `src/TrafficSignScanner.Mcp`
- `tests/TrafficSignScanner.Core.Tests`
- `evals/TrafficSignScanner.Evals`

## Next Phase After Review

After G3 approval, start the first implementation slice: `core-preprocessing`.

Do not implement capability logic until the user approves the G3 capability plan.
