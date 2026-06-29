import type { Action, Finding, ResourceChange, Risk } from "./types.js";
import { RULES } from "./rules/index.js";

/** Irreversibility-ordered action weights (see docs/adr/0001). */
export const ACTION_WEIGHTS: Record<Action, number> = {
  delete: 40,
  replace: 40,
  unknown: 40, // unrecognized action → treat as risky, never zero (fail-safe)
  update: 15,
  create: 5,
  "no-op": 0,
  read: 0,
};

export const HIGH_RISK_THRESHOLD = 70;
export const MEDIUM_RISK_THRESHOLD = 40;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Locale-independent comparison (NFR-DETERMINISTIC-01): plain code-unit order. */
const compareAddress = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Map a numeric score to a risk level. */
export function classify(score: number): Risk {
  if (score >= HIGH_RISK_THRESHOLD) return "high";
  if (score >= MEDIUM_RISK_THRESHOLD) return "medium";
  return "low";
}

/** Score a single change: action weight + matched rule weights, clamped 0..100. */
export function scoreChange(change: ResourceChange): Finding {
  const rules = RULES.map((rule) => rule(change)).filter((hit) => hit !== null);
  const raw = ACTION_WEIGHTS[change.action] + rules.reduce((sum, r) => sum + r.weight, 0);
  const score = clamp(raw, 0, 100);
  return {
    address: change.address,
    type: change.type,
    action: change.action,
    rules,
    score,
    risk: classify(score),
  };
}

/** Score every change and rank: score desc, ties broken by address asc (FR-SCORE-02). */
export function scoreChanges(changes: ResourceChange[]): Finding[] {
  return changes
    .map(scoreChange)
    .sort((a, b) => b.score - a.score || compareAddress(a.address, b.address));
}
