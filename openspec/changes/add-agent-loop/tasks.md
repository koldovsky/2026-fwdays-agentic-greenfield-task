## 1. Provider port

- [ ] 1.1 Define LLM provider port in `shared/lib/llm` (stream + complete); `LLM_PROVIDER` config
- [ ] 1.2 Claude adapter (default, latest Claude model) isolating the SDK; assert no user ID in payloads (NFR-SEC-02)
- [ ] 1.3 Optional ChatGPT adapter behind the same interface

## 2. Skill registry

- [ ] 2.1 Define skill type `run(state, ctx) → partialState` + registry
- [ ] 2.2 Skills: `parse-cv`, `extract-requirements`, `generate-bullet` (reuse existing prompt builders/parsers)
- [ ] 2.3 `ground-bullet` skill — ctx built with ONLY { bullet, cvText }; JD/requirements/gen transcript withheld by type (FR-BULLETS-03, BC-HONESTY-01)
- [ ] 2.4 `score` skill wraps pure `shared/lib/scoring` — no LLM (TC-PURE-01)

## 3. Agent loop + wiring

- [ ] 3.1 Bounded plan/act/observe loop in `features/run-tailoring` with step cap + per-requirement progress
- [ ] 3.2 Retry ≤ 2 per step, then calm Ukrainian failure state; no partial/blank render; no charge (FR-TAILOR-03, NFR-OBS-01)
- [ ] 3.3 Queue producer/consumer (BullMQ/Redis) or inline route-handler MVP; stream progress + tokens to client (FR-TAILOR-01/02, NFR-PERF-01/02)
- [ ] 3.4 Replace `views/tailor-workspace` stub fixture with real loop output; persist result (add-persistence)

## 4. Evals, verify & review

- [ ] 4.1 honesty-eval: grounding context-isolation + overclaim detection (BC-HONESTY-01/02)
- [ ] 4.2 agent-verify: build/tsc/lint/tests; evidence for FR-TAILOR-01/02/03, FR-BULLETS-01/03, NFR-PERF/OBS
- [ ] 4.3 Independent checker-review vs PRD + FSD (shared/lib framework-free; grounding isolation intact)
