import type Anthropic from '@anthropic-ai/sdk';
import { buildConfirmation } from '../food/confirm.js';
import { lookupById } from '../food/lookup.js';
import { fromMatch, resolveFood } from '../food/resolve.js';
import { isWeightOrVolumeUnit, reconcileQty } from '../food/scale.js';
import type { Confirmation, FoodClient, ParsedFood, ResolvedFood } from '../food/types.js';
import { writeFoodLog } from '../food/write.js';
import { DECIMAL_SOURCE } from '../util/num.js';
import type { TextOpenQuestion } from './types.js';

// Answer resolution (design D3, revised per review). The pending question's `clarification.kind` —
// NOT the answer's shape — decides how the answer is applied, so a bare "5" answering a fat% question
// can never be misread as a quantity, and a chosen catalog row is selected by id (never re-estimated
// into a doubled string). ONE tenant-scoped food_log row is then written for the ORIGINAL date
// (invariant #8), the pending question cleared by the caller. Three bounded shapes:
//   • quantity     → rescale the pending basis in CODE, ZERO LLM calls (invariants #2/#5);
//   • descriptor   → fold the answer into the product and re-run resolveFood → ≤1 LLM call;
//   • disambiguation → look the chosen catalog row up by id → a `fact`, ZERO LLM calls.
// Only the pending question + this reply ever reach the model — no chat history (invariant #1).

// A free-text QUANTITY answer is a number alone or a number + a weight/volume word ("150 грамм", "2",
// "250 ml"). Anchored end-to-end so "5%" (unit "%") is not read as a bare quantity; `ё` and Latin
// letters covered so a trailing unit word never leaks into the number.
const QUANTITY = new RegExp(`^(${DECIMAL_SOURCE})\\s*([a-zа-яёіїєґ]*)$`, 'iu');

const parseQuantityAnswer = (answer: string): { qty: number; unit: string } | null => {
  const match = QUANTITY.exec(answer.trim());
  if (match?.[1] === undefined) {
    return null;
  }
  const qty = Number(match[1].replace(',', '.'));
  const unit = match[2] ?? '';
  if (!Number.isFinite(qty) || qty <= 0) {
    return null;
  }
  if (unit !== '' && !isWeightOrVolumeUnit(unit)) {
    return null;
  }

  return { qty, unit };
};

/** Rescale the pending food's own basis to the answered quantity — pure code, no model call. */
const rescale = (resolved: ResolvedFood, qty: number, unit: string): ResolvedFood => ({
  ...resolved,
  qty: reconcileQty(qty, unit, resolved.per),
});

/** Re-resolve with the descriptor folded into the ORIGINAL product string (fat%, prep). */
const refineDescriptor = (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  parsed: ParsedFood,
  descriptor: string,
): Promise<ResolvedFood> =>
  resolveFood(client, anthropic, userId, {
    ...parsed,
    product: `${parsed.product} ${descriptor}`.trim(),
  });

/**
 * Select the chosen catalog row by id (the disambiguation answer is a candidate id) and scale it to
 * the original quantity — a `fact`, zero LLM calls. A stale/foreign id (or a typed non-id answer)
 * falls back to re-resolving the ORIGINAL product alone (≤1 call) — never folding the bogus id into
 * the product string — so the entry is still logged honestly.
 */
const refineDisambiguation = async (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  pending: TextOpenQuestion,
  answer: string,
): Promise<ResolvedFood> => {
  const id = Number(answer);
  if (Number.isInteger(id) && id > 0) {
    const match = await lookupById(client, userId, id);
    if (match) {
      return fromMatch(match, pending.parsed);
    }
  }

  return resolveFood(client, anthropic, userId, pending.parsed);
};

/** Apply the answer per the pending question's routing `kind` (never per the answer's shape). */
const refine = (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  pending: TextOpenQuestion,
  answer: string,
): Promise<ResolvedFood> | ResolvedFood => {
  if (pending.clarification.kind === 'disambiguation') {
    return refineDisambiguation(client, anthropic, userId, pending, answer);
  }
  if (pending.clarification.kind === 'quantity') {
    const quantity = parseQuantityAnswer(answer);
    if (quantity) {
      return rescale(pending.resolved, quantity.qty, quantity.unit);
    }
  }

  return refineDescriptor(client, anthropic, userId, pending.parsed, answer);
};

export const resolveAnswer = async (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  pending: TextOpenQuestion,
  answer: string,
): Promise<Confirmation> => {
  const refined = await refine(client, anthropic, userId, pending, answer);
  const row = await writeFoodLog(client, userId, refined, pending.date, pending.meal);

  // Detect the confirmation's language from the user's ORIGINAL product words, not the answer —
  // a `q:` disambiguation tap answers with a numeric row id ("12") and a descriptor tap with "5%",
  // neither of which carries the user's language (invariant #6). Mirrors logExpiredEstimate.
  return buildConfirmation(pending.parsed.product, row);
};
