# ADR-0015 — Coach persona & precision-first clarification policy

*Status: Accepted · Date: 2026-06-30 · Source: grilling session (this design), AGENTS.md
non-negotiable rules 1/3/5/6, [requirements.md §8.7](../requirements.md) (log-by-default),
CONTEXT.md (Open Question, Source/Estimate), [ADR-0013](./0013-eval-framework.md) (tone + ask/log
graders).*

## Context

The bot's LLM calls had no agreed **persona** and no sharp **clarification policy** beyond
requirements §8.7's "**log by default; ask only when it materially matters**" and the Estimate tag
as a "pressure-release valve." Two pulls surfaced that §8.7 alone doesn't resolve:

1. **Precision before calories.** When a plate photo (or terse text) is missing a *calorie-moving*
   detail — was it fried in oil, is there dressing, what portion — §8.7's wording lets the bot lean
   on a pure visual **guess** and log it as an estimate. The owner wants the opposite reflex on those
   high-leverage unknowns: **ask one sharp question instead of guessing** — *but stay quiet when the
   photo/text already contains everything needed* (no disturbing the user over nothing).
2. **An honest coaching voice.** The bot should tell the truth about trade-offs ("pizza won't make
   you thinner"), not flatter. Unscoped, "honest" risks tipping into food-moralizing — "good/bad
   foods," guilt, shame — which is both bad nutrition practice and a disordered-eating hazard.

The risk in over-correcting (1) is reversing Rule 3 (don't interrogate over small uncertainty) and
Rule 5 (no agent loop) by turning every meal into a multi-turn interrogation.

## Decision

### Persona — one honest voice, global, cacheable

A single **coaching persona** lives in the **stable system prefix** shared by every LLM call
(logging, queries, Reviews, metrics) — so it is **prompt-cached** (Rule 5) and the voice is
consistent across surfaces. Reviews already require an honest verdict (CONTEXT.md), so a separate
review-only voice would diverge for no reason. Voice = **blunt-factual, no shame**:

- State trade-offs in **numbers + consequence** ("pizza ~1200 kcal = half today's target; fits if
  you want it, but no deficit left"), not verdicts on the food.
- **No food-moralizing** — no "good/bad foods," no guilt, no shame. Any food fits if it fits the
  targets. Honesty is about **energy balance and trade-offs**, never the user's worth.
- **Mirror the user's language** (RU/UA/EN/mixed) in prose (Rule 6); structural fields stay English.
- Surface **estimates honestly** — say when a number is a ±20–30% estimate rather than a fact.

### Clarification — precision-first, but quiet when complete

Refines §8.7 from "ask only when material" to **"don't disturb when you can see it; don't guess when
you can't."**

- **Log, no question**, when the calorie-setting info is already present: complete text
  ("200г куриного филе"), a clean Food Database match, or a self-sufficient photo.
- **Ask** only when a **high-leverage variable is hidden/ambiguous** and one question resolves it.
  The prompt carries an explicit hidden-leverage checklist: **cooking fat** (oil/butter/ghee),
  **sauce/dressing/mayo**, **fried vs baked vs raw**, **unknown portion**, **sugary drink**,
  **protein variant fat%** (творог 0/5/9). These move a dish enough to matter.
- **Leverage threshold** — skip small uncertainty (≈±50 kcal / below the band). That stays a logged
  estimate; it is not worth a question. This preserves Rule 3.
- **Budget: one batched round.** At most **one** clarifying message per logging event, batching the
  highest-leverage unknown(s) into a single question (Telegram inline buttons where the answer is a
  fixed set). Answer → log. **No multi-turn chain** (Rule 5).
- **Fallback on no answer.** The Open Question expires in minutes (CONTEXT.md). On expiry → **log the
  best estimate** (±20–30%, `source=estimate`), never drop the entry. **Estimate is the fallback,
  not the first move** — the inversion of §8.7's lean for *high-leverage* unknowns only.

### Evals (ties to [ADR-0013](./0013-eval-framework.md))

- **Dataset eval (code grader):** ask-vs-log fires on high-leverage hidden unknowns and *only* those
  — a self-sufficient photo / complete text / clean Food-DB match must **not** trigger a question.
- **Judge eval (rubric):** persona is honest and **non-moralizing** — `CRITICAL:` no "good/bad food",
  no shame; states trade-offs in numbers; mirrors language. Reuses ADR-0013's judge path.

## Consequences

- **+** Precise where precision is cheap (one question on hidden fat), quiet everywhere else — the
  estimate tag still absorbs small uncertainty, so UX stays light.
- **+** One cacheable persona → consistent honest voice across logging and Reviews; no second prompt.
- **+** The no-moralizing rule keeps coaching best-practice and safe (avoids disordered-eating nudges)
  while still delivering the blunt truth the owner asked for.
- **+** One-round + leverage-threshold + expiry-fallback keep Rules 3 and 5 intact — no interrogation,
  no agent loop.
- **−** Precision-first nudges *more* questions on photos than pure estimate-default would; bounded by
  the one-round cap and leverage threshold, but it is a small added friction on ambiguous plates.
- **−** "Blunt" risks reading as harsh; mitigated by the no-shame rule and numbers-not-judgment, and
  gated by the tone judge eval.
- **−** Adds an eval surface (ask/log discrimination + tone rubric) that must be authored and kept
  green.

## Alternatives considered

- **Always ask, every dish** — confirm/clarify on every non-exact match. Highest precision, but
  reverses Rule 3 into interrogation and tanks UX. Rejected.
- **Estimate-default only (literal §8.7)** — never ask on photos, always log the visual guess. Cheap
  and quiet, but blind-guesses hidden fat (oil swings a dish 200–400 kcal). Rejected — the precision
  gap the owner flagged.
- **Ask until precise** — keep asking across turns until macros are pinned. Most accurate, but a
  multi-turn loop (reverses Rule 5). Rejected in favor of one batched round + estimate fallback.
- **Gentle/encouraging voice** — softens trade-offs. Contradicts the "won't get thinner" ask.
  Rejected.
- **Food-log-only persona scope** — honest voice on the food call only; Reviews keep a separate tone.
  Rejected — divergent voice for no benefit, and Reviews already need honesty.
