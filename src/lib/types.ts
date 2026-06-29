/**
 * Normalized Terraform action (replace = create+destroy collapsed).
 * `unknown` is a fail-safe for action strings we don't recognize — a risk tool must
 * never silently treat a novel/destructive action as zero risk.
 */
export type Action = "create" | "update" | "delete" | "replace" | "no-op" | "read" | "unknown";

/** Risk classification derived from a score. */
export type Risk = "high" | "medium" | "low";

/** A single resource change extracted from a `terraform plan -json`. */
export interface ResourceChange {
  address: string;
  type: string;
  name: string;
  action: Action;
  tags: Record<string, string>;
}

/** A policy rule that matched a change. */
export interface RuleHit {
  id: "missing-required-tags" | "risky-delete";
  weight: number;
  detail: string;
}

/** A scored change: the change plus matched rules, score, and risk level. */
export interface Finding {
  address: string;
  type: string;
  action: Action;
  rules: RuleHit[];
  score: number;
  risk: Risk;
}
