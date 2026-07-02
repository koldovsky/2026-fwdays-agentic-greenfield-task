// requirement entity — business noun for a single ranked JD requirement.
// Types re-exported from the shared scoring core (single source of truth).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO.

import type { Requirement } from "@/shared/lib/scoring";

export type { Requirement, RequirementImportance } from "@/shared/lib/scoring";

/** Entity-level view type: a requirement with its extraction/priority rank. */
export type RankedRequirement = Requirement & { readonly rank: number };
