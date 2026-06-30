## Context

FR-1 (requirements §8.0): every inbound message is first classified by one Sonnet call. `data`
landed the store; the router is what turns a message into an action. This change also bootstraps the
eval framework ([ADR-0013](../../../docs/adr/0013-eval-framework.md)) because the router is the first
capability with a labeled accuracy suite. Constraints: **no agent loop** (invariant #5 — cost), DB is
the memory (#1 — no chat history to the model), cost cap M5 ≤ $3/mo, CI stays key-less.

## Goals / Non-Goals

**Goals:**
- `src/llm/` Anthropic client seam (single call, structured output, cached prefix) on
  `claude-sonnet-4-6`.
- `src/router/` classify → `{ intent, fields, date }` with date resolved in user TZ.
- Shared prompt-cached system prefix (voice deferred to `coach-persona`).
- Eval framework: dataset runner, key-less ratchet, `router-intent` suite.
- `bot-runtime` routes non-command text through the classifier.

**Non-Goals:**
- The intent **handlers** (food write, SQL query, correction, clarify) — those are their own
  changes. The router only classifies + dispatches; the first wired path can be `query`/echo.
- The ephemeral open-question mechanic (lands in `clarify`) — the router only supports the `answer`
  intent shape.
- The coaching **voice** (lands in `coach-persona`) — this change ships the prefix *seam*, not the
  persona prose.
- Judge evals — only the deterministic dataset eval is in scope (ADR-0013 reserves judge evals for
  subjective surfaces).

## Decisions

- **Model `claude-sonnet-4-6`, single `messages.create` call, `temperature: 0`.** Sonnet 4.6 still
  accepts `temperature` (unlike Opus 4.7+/Fable), so temperature 0 gives reproducible classification.
  Structured output via `output_config.format` (a JSON schema). The SDK's `zodOutputFormat` /
  `messages.parse` auto-parse helper requires **zod v4**, but the project pins **zod v3** (foundational
  — `config/env` already ships on it), so instead we derive the JSON schema from the same zod schema
  via `zod-to-json-schema` (stripping the top-level `$schema` key the API rejects; it already emits
  `additionalProperties: false` + `required`) and validate the returned text client-side with
  `schema.parse`. **No tool-call loop** — one request, one validated result (invariant #5). The
  `llm-client` module is the single seam where this is enforced. **Risk:** the structured-output path
  is mocked in tests; verify it against a live Sonnet call at deploy (alongside the live eval run).
- **`answer` is excluded from the schema unless a question is pending.** `makeRouterSchema(allowAnswer)`
  builds the intent enum with or without `answer`; this change never sets a pending question, so the
  constrained output cannot return `answer` (§8.0). The ephemeral open-question source lands in
  `clarify`.
- **Stable system prefix carried as a cached block** (`cache_control: { type: "ephemeral" }`), with
  the per-message text appended *after* it so volatile content never invalidates the prefix.
  **Risk:** Sonnet 4.6's minimum cacheable prefix is ~2048 tokens; the M3 prefix may start shorter
  and silently not cache (`cache_creation_input_tokens: 0`). We still mark it (free once
  `coach-persona` fattens the prefix) and assert cache behavior via `usage` in a check, not a hard
  gate.
- **Date resolution split: model proposes a token, code decides the date.** The model returns
  `today` / `yesterday` / explicit `YYYY-MM-DD` only; `src/router/date.ts` resolves it against the
  user's timezone (default `Europe/Kyiv`) using `Intl` (compute the user-local calendar date, then do
  date-only arithmetic). The LLM never computes "today" — that keeps back-dating deterministic and
  unit-testable without an LLM call. After-midnight cutoff is deferred (per §8.0); the arrival-local
  date + explicit "вчера" override covers it.
- **No chat history to the model** (invariant #1): the request carries only the current message (plus
  an optional pending open-question + reply once `clarify` exists). Totals/answers come from SQL
  downstream, never reconstructed context.
- **Eval framework shape (ADR-0013):** `evals/datasets/router-intent.jsonl`
  (`{input, expected:{intent,date?}, meta:{trace:["FR-1"]}}`); `npm run evals` = `tsx evals/run.ts`
  issues the **real** classify at `temperature: 0` over the dataset and writes
  `evals/results/latest.json` (gitignored); `npm run check:evals` = `node
  scripts/check-eval-ratchet.mjs` compares `latest.json` to committed `quality/eval-baseline.json`
  per capability/field, **key-less**, ratchet-up-only, graceful-skip before first run. CRITICAL
  fields (e.g. `intent` never misclassifying a clear `log` as `query`) carry the 100% bar; overall
  accuracy carries the per-capability threshold.

**No new ADR** — this implements existing decisions (no-agent-loop invariant, ADR-0013 eval
framework, the §8.0 flow). The date-split and cache-min risk are design notes, not reversals.

## Risks / Trade-offs

- **[System prefix below the 2048-token cache minimum on Sonnet 4.6]** → marks won't cache yet;
  acceptable (the prefix grows with `coach-persona`); we verify via `usage.cache_read_input_tokens`
  rather than gate on it.
- **[LLM cost from eval runs]** → curated ~10–30 cases, run locally only; CI is key-less (ADR-0013).
  Within the M5 cap.
- **[Residual model nondeterminism at temp 0]** → absorbed by grading **accuracy over the dataset**,
  not per-call pass; CRITICAL fields keep a 100% bar (ADR-0013).
- **[Timezone math edge cases (DST, midnight)]** → date resolution is pure code with unit tests;
  after-midnight cutoff explicitly deferred per §8.0.

## Migration Plan

1. Add `@anthropic-ai/sdk`; `src/llm/` client + cached prefix + zod output schema.
2. `src/router/` classify + `date.ts`; wire `bot-runtime` to route non-command text.
3. Eval framework: runner, ratchet script, `router-intent.jsonl`, baseline.
4. Local gates: tests (date resolution, no-history payload, dispatch), `npm run evals` →
   `check:evals` ratchet, lint/format/typecheck/build.
- **Rollback:** the classifier is additive; reverting leaves `/start` working. No schema/state change.

## Open Questions

- Exact per-capability accuracy threshold for `router-intent` — seed the baseline from the first real
  run, then ratchet. Not blocking.
