import type { CatalogMatch } from '../food/lookup.js';
import type { ResolvedFood } from '../food/types.js';
import { type Clarification, isAskable } from './types.js';

// Ask-vs-log decision (design D1, ADR-0015). PURE code — it reads signals the resolution ALREADY
// produced (the estimate call's optional `clarify`, and the catalog-match count), never a new LLM
// call. Returns a Clarification to ask, or null to log directly. A clean single match / complete
// input / sub-threshold uncertainty logs (the model omits `clarify` for ≈±50 kcal — invariant #3).

export type { Clarification };

/** Marks a code-raised multi-match Clarification (its `kind` is `disambiguation`). */
export const DISAMBIGUATION_UNKNOWN = 'catalog-match';

/**
 * A distinguishing label for one candidate. Because catalog lookup is exact-name, a >1 match means
 * two rows share the SAME name (a user's own entry + a global one), so the name alone can't tell them
 * apart — we surface the kcal/basis, the figure the choice actually turns on (fixes an identical-label
 * disambiguation). The callback VALUE is the row id (invariant #6: structural values stay English).
 */
const candidateOption = (candidate: CatalogMatch): { label: string; value: string } => ({
  label: `${candidate.name} — ${candidate.base.kcal} kcal/${candidate.per}`,
  value: String(candidate.id),
});

/**
 * Build the disambiguation Clarification when >1 catalog row matched (code-raised, zero LLM calls).
 * `question` carries the product NAME; question.ts wraps it in localized prose (invariant #6). The
 * options carry each candidate's id so resolution selects the chosen row by id — never re-estimates.
 */
const disambiguation = (resolved: ResolvedFood, candidates: CatalogMatch[]): Clarification => ({
  kind: 'disambiguation',
  unknown: DISAMBIGUATION_UNKNOWN,
  question: resolved.name,
  options: candidates.map(candidateOption),
});

export const decideAskOrLog = (
  resolved: ResolvedFood,
  clarify: Clarification | null,
  candidates: CatalogMatch[],
): Clarification | null => {
  if (candidates.length > 1) {
    return disambiguation(resolved, candidates);
  }
  if (isAskable(clarify)) {
    return clarify;
  }

  return null;
};
