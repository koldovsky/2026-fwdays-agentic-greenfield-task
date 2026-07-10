# Honesty Eval

Author and run evals for Vouch's honesty core — the two-pass grounding and overclaim-risk detection. Use when building or changing prompts or the tailoring pipeline, or on "add evals", "test grounding", "check overclaim detection".

Invoked as `/honesty-eval`. The argument (if any) scopes the run (a change name, requirement ID, diff ref, or slice name).

Evals for the product's differentiator: honest output. Honesty cannot regress — a failing honesty eval is a blocker.

**Steps**

1. **Read the rules.** `BC-HONESTY-01/02`, `FR-BULLETS-01/02/03`, `FR-CHECKLIST-01/02` in `docs/cv-agent-requirements.md`.

2. **Locate targets.** Generation prompt + grounding prompt, `shared/lib/scoring/checklist.ts` (pure), and the pipeline (`worker/` / `run-tailoring`).

3. **Build eval cases** — fixtures of `(cvProfile, requirement | bullet) → expected { status, grounded }`. Cover at minimum:
   - Grounded bullet → linked to a real source sentence (`met` / `partial`).
   - Unsupported claim → `overclaim-risk`, excluded from export by default.
   - Fabricated skill not present in the CV → must be flagged, never emitted as grounded.
   - Checklist determinism → same input yields same `{status, rationale}` (pure function).
   - Rationale = one Ukrainian sentence, ≤100 chars, no emoji (`FR-CHECKLIST-03`).

4. **Two-pass integrity.** Assert the grounding pass uses a separate, stricter prompt and does **not** share context with generation (`FR-BULLETS-03`).

5. **Run.**
   - Pure-function evals → unit tests (fast, deterministic, off-browser — `TC-PURE-01`).
   - LLM-pass evals → a scored harness against the latest Claude models; report pass rates and set thresholds (model output may vary).

6. **Report** pass/fail with concrete failure examples. Update `docs/current-state.md`.

**Guardrails**
- Never weaken or delete a case to make it pass — fix the prompt/pipeline instead.
- Overclaim detection cannot be disabled (`BC-HONESTY-02`).
- Anonymize fixtures — no real PII; prefer the sample CV/JD in `docs/vouch-design-system/uploads` for realism.
