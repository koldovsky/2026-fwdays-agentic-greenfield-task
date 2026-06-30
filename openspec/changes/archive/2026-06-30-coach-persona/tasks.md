## 1. Persona + clarification policy in the shared prefix

- [x] 1.1 Extend `src/llm/systemPrefix.ts` `SYSTEM_PREFIX` with labeled sections — **Voice** (blunt-
  factual, numbers+consequence, no good/bad foods, no guilt/shame, surface estimates honestly),
  **Clarification policy** (precision-first: log when complete; ask one batched round only on a
  hidden high-leverage mover with the explicit checklist — cooking fat, sauce/dressing, fried-vs-
  baked, unknown portion, sugary drink, protein fat%; skip ≈±50 kcal; estimate is the expiry
  fallback, not first move), **Language** (mirror RU/UA/EN in prose, structural fields English).
  Keep the existing routing lines. Update the stale code comment about the prefix being routing-only.
- [x] 1.2 Confirm the prefix is still emitted as a **single** `cache_control: ephemeral` block by
  `systemPrefixBlocks()` (no shape change; only the text grows).

## 2. Judge-eval harness (first judge capability — ADR-0013)

- [x] 2.1 Add `evals/judge.ts`: a `judge(produced, rubric)` helper that issues a **fresh** LLM call
  (distinct from the producer) with the rubric as system prompt and structured output
  `{ score: number (0–100), criticalMiss: boolean, reasoning: string }`. Cap score at ≤ 49 when
  `criticalMiss` is true. Add double-judge on a borderline band around the threshold (combine via min).
- [x] 2.2 Add `evals/cases/coach-persona-tone.eval.ts`: `{ scenario, produce(), rubric }` cases whose
  `produce()` calls the real coaching path through the shared prefix. Rubric criteria include
  `CRITICAL:` no good/bad-food moralizing, `CRITICAL:` no guilt/shame, `CRITICAL:` estimates surfaced
  as estimates not facts, `CRITICAL:` prose mirrors the user's language; plus non-critical clarity.
  Cover RU + EN scenarios and a moralizing-bait scenario ("I was bad, I ate a donut").
- [x] 2.3 Wire the judge run into `evals/run.ts` so `npm run evals` runs the dataset **and** judge
  suites, writing `coach-persona-tone` into `evals/results/latest.json` as
  `{ "coach-persona-tone": { "score": N } }` (same shape the ratchet walks).

## 3. Verification (invariants touched)

- [x] 3.1 Unit test (vitest, `test/llm/systemPrefix.test.ts`): the prefix string contains the
  no-moralizing / numbers-not-verdict cues, the high-leverage checklist terms, and the
  language-mirror + structural-fields-English rule (invariant #6); and `systemPrefixBlocks()` returns
  exactly one block with `cache_control: { type: "ephemeral" }` (invariant #5 — one cached block).
- [x] 3.2 Unit test (vitest, `test/evals/judge.test.ts`): the judge grader's pure logic — a
  `criticalMiss: true` result caps score ≤ 49; borderline double-judge combines via min — exercised
  with a stubbed judge call (no real LLM in the test gate, per ADR-0013 boundary rule).
- [~] 3.3 *(deploy-time gate — no LLM key in sandbox; baseline stays `{}` so the ratchet passes; seed `coach-persona-tone` on first keyed run)* Run `npm run evals` to produce the `coach-persona-tone` score and seed it into
  `quality/eval-baseline.json`; then `npm run check:evals` (ratchet green). **If no LLM key is
  available** (sandbox), skip-with-note as a deploy-time gate and record it in the loop log.

## 4. Docs + review

- [x] 4.1 Update `docs/current-state.md` (coach-persona landed — persona/policy in prefix, judge-eval
  path live + date); flip any AGENTS.md `evals` line that becomes more-real; run `npm run docs:check`.
- [x] 4.2 **Maker ≠ checker:** hand the diff to a **separate reviewer subagent** (the `review` skill —
  Standards + Spec axes) and resolve every finding before commit. No self-approval.
