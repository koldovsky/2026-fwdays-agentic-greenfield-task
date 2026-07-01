## 1. Clarify module types & in-memory store (ADR-0019)

- [x] 1.1 Create `src/clarify/types.ts`: `Clarification { unknown: string; question: string;
      options?: string[] }`, `OpenQuestion { resolved: ResolvedFood; routed: RoutedLog; date: string;
      askedAt: Date }`, and `LogOutcome = { kind: 'logged'; confirmation: Confirmation } | { kind:
      'ask'; question: OutboundQuestion; pending: OpenQuestion }` (+ `OutboundQuestion { text: string;
      options?: string[] }`). Reuse the food domain shapes — do not re-declare `ResolvedFood`.
- [x] 1.2 Create `src/clarify/store.ts`: a module-scoped `Map<bigint, OpenQuestion>` behind
      `set(chatId, q)`, `peek(chatId)`, `take(chatId)` and a **pure** `isExpired(askedAt, now)` against
      a `TTL_MS` constant (~10 min). Clock injected (`now: () => Date`) for tests; **no** timer/cron
      (invariant #5, ADR-0019). At most one pending question per `chatId`.

## 2. Ask-vs-log decision (rides existing resolution — zero new call class)

- [x] 2.1 Extend `src/food/estimate.ts`: add an **optional** `clarify` object to `estimateSchema`
      (`{ unknown, question, options? }`) that the model fills — guided by the coach-persona prefix
      checklist — when a high-leverage unknown is hidden. Return it on `FoodEstimate` alongside the
      macros (macros remain the expiry fallback). Still exactly one call, no loop (invariant #5).
- [x] 2.2 Extend `src/food/lookup.ts`: detect **multiple** catalog matches (own + global, `catalogWhere`)
      for the product; expose the candidates (e.g. `lookupCandidates`) so a >1 match can raise a
      disambiguation question. A single clean match keeps today's behavior (fact path, logs directly).
- [x] 2.3 Create `src/clarify/decide.ts`: `decideAskOrLog(resolved, clarify?, candidates?)` →
      `Clarification | null` — returns a `Clarification` on a hidden high-leverage unknown (estimate
      `clarify` field) or on multiple Food-DB matches (code); returns `null` (log directly) for a clean
      match / complete input / sub-threshold uncertainty (invariant #3 — small uncertainty is logged).

## 3. Question shaping & answer resolution (reuse lang/num/scale — no new copies)

- [x] 3.1 Create `src/clarify/question.ts`: `buildQuestion(clarification, text): OutboundQuestion` —
      prose in the user's language via `src/util/lang.ts`, `options` passed through for an inline
      keyboard, else free-text. Choice/callback values stay English (invariant #6). No new `detectLang`
      copy (duplication gate).
- [x] 3.2 Create `src/clarify/resolve.ts`: `resolveAnswer(prisma, anthropic, userId, pending, answer)`
      — a quantity/portion answer rescales in code (reuse `src/food/scale.ts`, **zero** LLM calls, like
      `correction`); a descriptor answer (fat%, fried/baked, chosen match) augments the product string
      and re-runs `resolveFood` (**≤1** call), then writes via `writeFoodLog` + returns
      `buildConfirmation`. Reuse `src/util/num.ts` for any formatting.

## 4. Service outcome + expiry fallback

- [x] 4.1 Change `FoodService.logFood` to return `LogOutcome` (design D2): resolve → `decideAskOrLog`;
      `null` → write + `{ kind: 'logged' }` (unchanged path); a `Clarification` → build the question +
      `OpenQuestion` (resolved-so-far food is the fallback) + `{ kind: 'ask' }`. Update `src/food/types.ts`.
- [x] 4.2 Add `logExpiredEstimate(pending)` handling: write the pending `resolved` as `source: estimate`
      through the tenant-scoped `writeFoodLog` for the original date — the fallback that **never drops
      the entry** (invariant #3, #8).

## 5. Bot wiring (`src/bot/bot.ts`)

- [x] 5.1 In `handleText`, after the onboarding gate, branch on the pending Open Question (design D4):
      (a) **pending & expired** → `logExpiredEstimate` + `take`, then classify fresh and route;
      (b) **pending & fresh** → classify with `hasPendingQuestion=true`; `answer` → `resolveAnswer` +
      reply + `take`; non-answer → `logExpiredEstimate` + `take`, then handle fresh;
      (c) **no pending** → classify as today; a `log` `ask` outcome → `store.set` + send the question.
- [x] 5.2 Add the `q:` callback namespace to `handleCallback` alongside `onb:` / `food:addfdb:`: a tap
      carries the chosen value → `resolveAnswer` + reply + clear pending; a tap with no pending question
      is answered and ignored (stale-tap guard). Send inline keyboards via the existing helper.
- [x] 5.3 Thread the clarify store + resolver through `BotDeps`/`createFoodService` construction
      (`src/index.ts`), keeping the food service the single writer of `food_log`.

## 6. Ask/log discrimination eval (ADR-0013)

- [x] 6.1 Author `evals/datasets/clarify-discrimination.jsonl`: labeled cases (capability-tagged,
      `trace: US-6`) that MUST ask (unstated fat% творог, unknown portion, multiple matches) and MUST
      NOT ask (complete text "200г куриного филе", clean single Food-DB match). Wire a deterministic
      code grader over the estimate call's `clarify` field into `evals/run.ts`; live run is deploy-time
      (skip-with-note, no key in sandbox — baseline stays passing).

## 7. Verification (per touched invariant)

- [x] 7.1 `test/clarify/store.test.ts`: `set/peek/take` round-trip; `isExpired` true past TTL, false
      within, against the injected clock; at most one pending per chat.
- [x] 7.2 `test/clarify/decide.test.ts`: asks on a hidden high-leverage unknown (`clarify` field) and on
      multiple matches; does **not** ask on a clean match / complete input / sub-threshold uncertainty
      (invariant #3).
- [x] 7.3 `test/clarify/resolve.test.ts`: quantity answer rescales in code with **zero** LLM calls
      (invariant #2/#5); descriptor answer re-resolves with **≤1** call; the written row is
      tenant-scoped for the original date (invariant #8) and never hand-sums a daily total (#2).
- [x] 7.4 Expiry fallback logs the pending entry as `source: estimate` and never drops it (invariant
      #3); a non-answer while pending takes the same fallback path, then the new message is handled fresh.
- [x] 7.5 No chat history sent to the model: assert the resolve/answer path sends only the pending
      question + reply, no prior turns (invariant #1); `hasPendingQuestion` gates the `answer` intent.
- [x] 7.6 Language mirroring: RU/UA/EN question + confirmation prose match the user's language while
      choice/callback values and `meal`/`source` stay English literals (invariant #6). Extend
      `test/bot/bot.test.ts` for the `q:` dispatch + pending-question branches in `handleText`.
- [x] 7.7 Run `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` — all green.

## 8. Review (maker ≠ checker)

- [x] 8.1 Hand the diff to a **separate** reviewer subagent (the `review` skill: Standards + Spec axes).
      Resolve every finding before commit — no self-approval. **Ran 2026-07-01 — returned 1 CRITICAL +
      warnings; change BLOCKED, findings below.**

## 9. Review findings — BLOCKING (must clear before commit/archive)

Reviewer (separate Opus subagent, Standards + Spec) returned these against the working-tree diff.
C1 + the bare-number misroute share one root cause: **`OpenQuestion` never records which `unknown`
was asked**, so `resolveAnswer` routes on answer *shape* instead of question *kind*. The fix reshapes
`OpenQuestion` to carry the pending `Clarification` (unknown + options + candidate ids) and routes
`resolveAnswer` by that — this also revises **design D3** ("append the chosen match to the product
string" is the flawed step) and the masking tests.

**Resolution (2026-07-01, round 2).** All blocking findings cleared in the working tree: `OpenQuestion`
now carries the asked `Clarification` (`kind` + candidate ids), `resolveAnswer` routes by that `kind`
(never answer shape), disambiguation selects the chosen catalog row by id (a `fact`, 0 LLM calls),
candidate labels are distinguished by kcal/basis, `q:` callbacks carry the option INDEX (64-byte safe),
the callback path guards expiry, callers act on `take()`'s value, the non-answer path reuses its single
classification, and two stale tests were rebuilt on the real select-by-id / index-tap paths. The eval
gained an `орехи` unknown-portion must-ask case. The just-introduced decimal-number regex duplicate was
extracted to `src/util/num.ts` (`DECIMAL_SOURCE`), repointing metrics + clarify (rule #12).

- [x] 9.1 **C1 (CRITICAL) — multi-match disambiguation is non-functional.** A tapped catalog name is
      routed to `refineDescriptor` (`src/clarify/resolve.ts:45-60,62-73`) → doubled product string
      (`"творог творог"`) → `resolveFood` miss → fresh **estimate** (loses the `fact`, violates
      invariant #3, wastes an LLM call, invariant #5). Fix: carry the candidates' `foodDbId`s in the
      `OpenQuestion`; on a disambiguation answer **select the chosen catalog row by id** (fact path),
      no re-resolve, no LLM call. Revise design D3 accordingly.
- [x] 9.2 **C1b — disambiguation buttons are identical.** `lookupCandidates` (`src/food/lookup.ts:35-46`)
      is exact-name `equals`, so `candidates.length > 1` only when an own + a global row share an
      identical name → `decide.ts:19-23` offers two identical labels. Distinguish them (e.g. "yours" vs
      "catalog", or append macros) so the choice is meaningful.
- [x] 9.3 **Bare-number misroute (WARNING).** A bare `"5"` answering a fat% question matches `QUANTITY`
      (`src/clarify/resolve.ts:20,62-73`) → `rescale(...,5,'')` → entry silently rescaled to **5 g**
      instead of fat 5%. Route by the stored `unknown` (portion → quantity; fat%/prep/match →
      descriptor), not by answer shape.
- [x] 9.4 **W2 — `q:<option>` callback_data can exceed Telegram's 64-byte limit** (`src/bot/bot.ts:108`).
      Cyrillic option (2 B/char, ~31 char limit) overflows → `BUTTON_DATA_INVALID` → `reply()` throws →
      whole ask fails. Bound it (index the option, or truncate/hash) like `onb:`/`food:`.
- [x] 9.5 **W3 — late tap resolves an expired Open Question** (`src/bot/bot.ts:249-265`). Text path
      guards expiry (`handleText:215`); `handleClarifyCallback` does not. Add the same `isExpired` check
      → fall back to the estimate on a late tap.
- [x] 9.6 **W4 — callers ignore `take()`'s return** (`src/bot/bot.ts:185-188,214-219`), defeating the
      reuse guard (`store.ts:25`). Resolve using `take()`'s returned value, not the stale `peek()` ref.
- [x] 9.7 **W1 (Spec) — eval missing the "unknown portion" must-ask case.** `evals/datasets/
      clarify-discrimination.jsonl` covers fat%/fat/dressing/sugar but no hidden-portion must-ask case;
      add one (spec enumerates it as a distinct must-ask category).
- [x] 9.8 **W2 (Spec) — double classifier call on a non-answer-while-pending** (`src/bot/bot.ts:174-194`
      → `routeFresh:132`). `resolvePending` classifies once, then `routeFresh` re-classifies the same
      message. Reuse the first result.
- [x] 9.9 **Fix the masking tests.** `test/clarify/decide.test.ts:44-51` fabricates distinct candidate
      names the exact-match query can't return; `test/clarify/resolve.test.ts:112-129` uses a `findFirst`
      mock that matches any `where`. Make them exercise the real select-by-id disambiguation path.
- [x] 9.10 (SUGGESTIONS, fold in where cheap) `OpenQuestion.routed` is dead (only `date` read);
      meal is re-inferred at answer/expiry time (wrong `meal` across a boundary — carry it from the
      event); extract the duplicated `(\d+(?:[.,]\d+)?)` fragment (also in `src/metrics/parse.ts:29`)
      and the take+`logExpiredEstimate`+`routeFresh` triad; widen `QUANTITY` (`ё`, trailing `.`).
- [x] 9.11 Re-run the reviewer subagent (maker ≠ checker) on the fixed diff; then resume the loop at
      the static/eval/docs/commit/archive gates. **Round 2 (2026-07-01): fresh Opus reviewer verified
      9.1–9.10 resolved, returned 1 MAJOR (invariant #6 — resolved-answer confirmation detected
      language from the answer, not the user's words) + 1 MINOR (redundant `peek`+`take`) + a stale-id
      SUGGESTION. Fixed: `resolveAnswer` now localizes off `pending.parsed.product`; `handleText`
      branches on `take()` alone; disambiguation stale-id falls back to `resolveFood(parsed)`; added two
      tests asserting the RU verb. Round-3 focused re-review → CLEAN, no regressions. Cleared to commit.**
