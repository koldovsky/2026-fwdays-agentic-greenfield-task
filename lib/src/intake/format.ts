// TYPED THROWING STUB — red state for tasks.md section 2 (2.2's red half).
// The signature and discriminated result type below are the contract pinned
// by format.test.ts; the body is implemented in tasks.md section 3 (3.2).
// No logic lives here yet — the function body is a single Not-implemented
// throw (same convention as the other section-2 red-round stubs).
//
// Framework-free pure core (TC-PURE-01): pure, synchronous, no I/O, no LLM.
//
// The candidate/valid format types are imported from state-machine.ts —
// the SAME `CandidateFormat` the reducer's `save_format` event carries and
// the same `ValidFormat` that is the only thing `fields.format` ever
// settles to — so the two modules can never drift apart on the enum
// (design.md Decision 2: `save_format`'s tool schema enum is exactly
// ["individual","group","unsure","instrument"], checked twice — once by
// the schema, once by this validator behind it).
//
// CONTRACT (design.md Decision 1's "Age/format validation gate"):
//   validateFormat(value) -> { ok: true; format } | { ok: false; code }
//     - "individual" / "group" pass, echoing the narrowed `ValidFormat`
//       back (BC-FORMAT-01: the only two bookable formats).
//     - "unsure" is rejected with code "FORMAT_UNSURE" — the caller owes
//       the deterministic format explanation (copy.ts's FORMAT_UNSURE_COPY)
//       and re-asks; the state never advances on it (BC-FORMAT-01).
//     - "instrument" is rejected with code "SCOPE_VIOLATION" — the caller
//       owes the voice-only scope explanation (copy.ts's
//       SCOPE_EXPLANATION_COPY); no instrument lesson is ever recorded
//       (BC-SCOPE-01, BC-SCOPE-02).

import type { CandidateFormat, ValidFormat } from "./state-machine.ts";

/** Discriminated validation result — the spec's two named format error
 *  codes (design.md Decision 1). */
export type FormatValidation =
  | { ok: true; format: ValidFormat }
  | { ok: false; code: "FORMAT_UNSURE" | "SCOPE_VIOLATION" };

export function validateFormat(value: CandidateFormat): FormatValidation {
  if (value === "individual" || value === "group") {
    return { ok: true, format: value };
  }
  if (value === "unsure") {
    return { ok: false, code: "FORMAT_UNSURE" };
  }
  return { ok: false, code: "SCOPE_VIOLATION" };
}
