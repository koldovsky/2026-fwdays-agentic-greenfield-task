## Why

Every inbound message needs to be understood before anything can act on it (FR-1, requirements §8.0).
The router is the spine: a single LLM call that classifies the message into one of six intents and
extracts the structured fields the downstream handlers need (including the date the row belongs to,
with "вчера"/"yesterday" back-dating). `data` gave us memory; the router is what decides *what to do*
with each message. It unblocks `coach-persona`, `food-text`, `query`, `correction`, `clarify`, and
the rest of M3.

## What Changes

- Add the **Anthropic client** (`@anthropic-ai/sdk`) in `src/llm/`, using `ANTHROPIC_API_KEY` (already
  validated in `config/`). Model: **`claude-sonnet-4-6`** (raw API, **no agent loop** — invariant #5).
- A **single deterministic classify call** (`temperature: 0`, structured output via
  `output_config.format` / a JSON schema) → `intent ∈ { log | query | metric | review_trigger |
  correction | answer }` plus extracted fields and a **date hint**.
- **Date/TZ resolution in code:** the model returns a relative date token (`today` / `yesterday` /
  explicit `YYYY-MM-DD`); code resolves it to the concrete calendar date in the user's timezone
  (default `Europe/Kyiv`). The LLM never computes "today" itself.
- **Stable, prompt-cached system prefix** (`cache_control: ephemeral`) that every later LLM call
  shares — this change establishes the prefix; `coach-persona` lands the voice into it.
- **`answer` is conditional** — only valid when an open question is pending (the ephemeral mechanic
  lands in `clarify`; the router just supports the intent). **No chat history** is sent to the model
  beyond the ephemeral open-question + reply (invariant #1).
- **Bootstrap the eval framework** ([ADR-0013](../../../docs/adr/0013-eval-framework.md)) — the router
  is the first eval consumer: a dataset runner (`npm run evals`), the key-less CI ratchet
  (`npm run check:evals` → `scripts/check-eval-ratchet.mjs`), `quality/eval-baseline.json`, and the
  `router-intent` labeled dataset.

## Capabilities

### New Capabilities
- `message-router`: the FR-1 classifier — one Sonnet call → intent + structured fields + resolved
  date (user TZ), on a shared prompt-cached system prefix, no agent loop.
- `llm-client`: the Anthropic client wrapper — single-call, structured-output, prompt-cache helper
  that every later LLM feature reuses (the seam that keeps "no agent loop" enforceable in one place).
- `eval-framework`: the deterministic dataset runner + CI ratchet (ADR-0013), seeded with the
  `router-intent` capability suite.

### Modified Capabilities
- `bot-runtime`: the long-poll message handler now routes non-command text through the classifier
  (first consumer can be the `query`/echo path) instead of only handling `/start`.

## Impact

- **New dep:** `@anthropic-ai/sdk` (runtime). New code: `src/llm/` (client, system prefix, schemas),
  `src/router/` (classify + date/TZ resolution), `evals/` (runner, datasets, results),
  `quality/eval-baseline.json`, `scripts/check-eval-ratchet.mjs`, `npm run evals` / `check:evals`.
- **Invariants touched:**
  - #5 **no agent loop** — central: one deterministic call, structured output, **prompt-cache the
    stable system prefix**; the `llm-client` seam is the single place this is enforced.
  - #1 **DB is the memory** — the router sends no chat history beyond the ephemeral open-question +
    reply; downstream answers come from SQL, never reconstructed context.
  - #6 **language** — prose mirrors the user (RU/UA/EN); the `intent` enum and field names stay
    English.
- **Memory/cost:** one Sonnet call per message. Prompt-caching the system prefix keeps cost down
  (note: Sonnet 4.6's cache minimum is 2048 tokens — a short prefix silently won't cache; the design
  addresses this). Within the M5 ≤ $3/mo cap; evals run locally only (ADR-0013), CI stays key-less.
- **Eval gate is wired:** the runner + key-less ratchet land here (the first capability suite). The
  committed baseline is `{}` and seeds from the first local `npm run evals` (per ADR-0013 — "seed the
  baseline from the first real run, then ratchet"); until then the ratchet skips/passes trivially. CI
  never runs the LLM, so `check:evals` only bites locally once scores exist.
