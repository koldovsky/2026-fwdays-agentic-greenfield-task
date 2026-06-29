import type { ResourceChange, RuleHit } from "../types.js";

/** Tag keys every managed resource must carry. */
export const REQUIRED_TAGS = ["owner", "environment"] as const;

/** Substrings that mark a resource type as stateful (data loss on destroy). */
export const STATEFUL_PATTERNS = [
  "_db",
  "database",
  "_bucket",
  "_disk",
  "_volume",
  "_instance",
  "_table",
  "_filesystem",
  "_cluster",
] as const;

/**
 * Config/attachment resources whose type *contains* a stateful pattern but which hold
 * no data themselves (destroying them is not data loss). Checked first to avoid the
 * `type.includes()` false positives a substring heuristic invites — e.g.
 * `aws_s3_bucket_public_access_block`, `aws_iam_instance_profile`, `aws_*_bucket_policy`.
 * A real tool would use an explicit per-provider allowlist; this denylist covers the
 * common lookalikes for the homework's scope (see docs/adr/0001).
 */
export const STATEFUL_DENYLIST = [
  "_public_access_block",
  "_instance_profile",
  "_bucket_policy",
  "_bucket_acl",
  "_bucket_versioning",
  "_bucket_ownership_controls",
  "_table_item",
] as const;

/** FR-TAGS-01: created/updated/replaced resources must carry the required tags. */
export function requiredTags(
  change: ResourceChange,
  required: readonly string[] = REQUIRED_TAGS,
): RuleHit | null {
  if (change.action !== "create" && change.action !== "update" && change.action !== "replace") {
    return null;
  }
  const missing = required.filter((key) => !Object.hasOwn(change.tags, key));
  if (missing.length === 0) return null;
  return {
    id: "missing-required-tags",
    weight: 20,
    detail: `missing tags: ${missing.join(", ")}`,
  };
}

/** FR-RISK-01: deleting or replacing a stateful resource is dangerous. */
export function riskyDelete(
  change: ResourceChange,
  patterns: readonly string[] = STATEFUL_PATTERNS,
): RuleHit | null {
  if (change.action !== "delete" && change.action !== "replace") return null;
  if (STATEFUL_DENYLIST.some((d) => change.type.includes(d))) return null;
  if (!patterns.some((p) => change.type.includes(p))) return null;
  return {
    id: "risky-delete",
    weight: 50,
    detail: `${change.action} of stateful resource`,
  };
}

/** All rules applied in order. */
export const RULES = [requiredTags, riskyDelete] as const;
