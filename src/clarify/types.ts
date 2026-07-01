import type { Confirmation, Meal, ParsedFood, ResolvedFood } from '../food/types.js';

// Open Question mechanic shapes (ADR-0015 precision-first, ADR-0019 in-memory store). The clarify
// module decides ask-vs-log on a logging event, holds ONE pending question per user, and resolves it
// from the next message. It reuses the food domain's ResolvedFood/Confirmation — never re-declares
// them (backend-conventions #12). Choice/option VALUES stay English literals (invariant #6); the
// LABEL a button shows may be localized.

/**
 * How the pending answer is applied (design D3, revised). This — NOT the answer's shape — is the
 * routing key `resolveAnswer` reads, so a bare "5" answering a fat% question can never be misread as
 * a quantity, and a chosen catalog row is selected by id (never re-estimated):
 * - `quantity`    — the unknown is the amount/portion → rescale the pending basis in code (0 calls).
 * - `descriptor`  — the unknown is a qualitative mover (fat%, prep, sauce) → fold + re-resolve (≤1).
 * - `disambiguation` — multiple Food-DB matches → select the chosen catalog row by id (fact, 0 calls).
 */
export type ClarifyKind = 'quantity' | 'descriptor' | 'disambiguation';

/** A fixed answer choice: the `label` a button shows, the English `value` resolution acts on. */
export interface ClarifyOption {
  label: string;
  value: string;
}

/** The hidden high-leverage unknown to resolve, with optional fixed-choice options (else free text). */
export interface Clarification {
  kind: ClarifyKind;
  unknown: string;
  question: string;
  options?: ClarifyOption[];
}

/** The raw clarify object the estimate schema carries (options are plain English strings there). */
export interface RawClarify {
  unknown: string;
  question: string;
  kind?: ClarifyKind | undefined;
  options?: string[] | undefined;
}

/**
 * Normalize a raw clarify object (the estimate schema's optional fields carry explicit `undefined`)
 * into a Clarification: default the routing `kind` to `descriptor` (the safe re-resolve path) when the
 * model omits it, and lift each string option into a `{label, value}` (label == value for a model
 * choice). `options` is omitted when absent so the shape satisfies exactOptionalPropertyTypes.
 */
export const toClarification = (raw: RawClarify): Clarification => {
  const kind: ClarifyKind = raw.kind ?? 'descriptor';
  const options = raw.options?.filter((value) => value.length > 0) ?? [];
  const base = { kind, unknown: raw.unknown, question: raw.question };

  return options.length > 0
    ? { ...base, options: options.map((value) => ({ label: value, value })) }
    : base;
};

/**
 * The pending Open Question held in-memory (ADR-0019). Holds ONLY what's needed to log on
 * resolution — the resolved-so-far food (also the expiry-fallback estimate), the ORIGINAL parsed
 * input (product/qty/unit, so an answer re-scales or re-resolves from the right basis), what was
 * asked (`clarification`, whose `kind` routes the answer), the meal captured at ASK time (no
 * boundary drift), and the target date — never any chat transcript (invariant #1).
 */
export interface OpenQuestion {
  resolved: ResolvedFood;
  parsed: ParsedFood;
  clarification: Clarification;
  meal: Meal;
  date: string;
  askedAt: Date;
}

/** The outbound clarifying message the bot renders — prose + optional inline-keyboard choices. */
export interface OutboundQuestion {
  text: string;
  options?: ClarifyOption[];
}

/** logFood's discriminated outcome (design D2): write-and-confirm, or defer to a clarification. */
export type LogOutcome =
  | { kind: 'logged'; confirmation: Confirmation }
  | { kind: 'ask'; question: OutboundQuestion; pending: OpenQuestion };
