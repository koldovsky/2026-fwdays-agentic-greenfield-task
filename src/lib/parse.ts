import { z } from "zod";
import type { Action, ResourceChange } from "./types.js";

const TagsHolder = z
  .object({ tags: z.record(z.string(), z.string()).optional() })
  .nullable()
  .optional();

const ChangeSchema = z.object({
  address: z.string(),
  type: z.string(),
  name: z.string(),
  change: z.object({
    actions: z.array(z.string()).nonempty(),
    before: TagsHolder,
    after: TagsHolder,
  }),
});

const PlanSchema = z.object({
  resource_changes: z.array(ChangeSchema).default([]),
});

/**
 * Collapse Terraform's `actions` array into a single normalized action.
 * Unrecognized actions map to `unknown` (fail-safe, surfaced as risk) — never to
 * `no-op`, which would hide them.
 */
function normalizeAction(actions: readonly string[]): Action {
  const has = (a: string) => actions.includes(a);
  if (has("delete") && has("create")) return "replace";
  if (has("delete")) return "delete";
  if (has("create")) return "create";
  if (has("update")) return "update";
  if (has("read")) return "read";
  if (actions.every((a) => a === "no-op")) return "no-op";
  return "unknown";
}

/**
 * Parse and validate a `terraform plan -json` document into resource changes.
 * Throws a clear error on malformed input (FR-PARSE-02).
 */
export function parsePlan(raw: unknown): ResourceChange[] {
  const result = PlanSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid terraform plan JSON: ${result.error.issues
        .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("; ")}`,
    );
  }

  return result.data.resource_changes.map((rc) => {
    const action = normalizeAction(rc.change.actions);
    // Deleted resources only exist in `before`; everything else reads from `after`.
    const source = action === "delete" ? rc.change.before : (rc.change.after ?? rc.change.before);
    return {
      address: rc.address,
      type: rc.type,
      name: rc.name,
      action,
      tags: source?.tags ?? {},
    };
  });
}
