// Test-first (red): lib/src/intake/format.ts's `validateFormat` does not
// exist as behavior yet (typed throwing stub only) — tasks.md 2.2.
//
// Contract this file pins down for the implementer (design.md Decision 1's
// "Age/format validation gate", Decision 2's closed enum):
//   - `validateFormat(value)` is a PURE, synchronous function over exactly
//     the candidate enum ["individual","group","unsure","instrument"] —
//     the same `CandidateFormat` the reducer's `save_format` event and the
//     agent tool's JSON schema carry (checked twice: schema + this
//     validator, defense in depth).
//   - Only "individual"/"group" ever validate (BC-FORMAT-01); "unsure" and
//     "instrument" map to the two named detour codes the reducer's
//     side-channel `detour` field is derived from.
import { describe, expect, it } from "vitest";
import { validateFormat } from "./format";

describe("validateFormat — format enum gate (BC-FORMAT-01) and voice-only scope (BC-SCOPE-01/02)", () => {
  // @trace FR-INTAKE-02
  // @trace BC-FORMAT-01
  it("passes 'individual', echoing the narrowed format back", () => {
    expect(validateFormat("individual")).toEqual({ ok: true, format: "individual" });
  });

  // @trace FR-INTAKE-02
  // @trace BC-FORMAT-01
  it("passes 'group', echoing the narrowed format back", () => {
    expect(validateFormat("group")).toEqual({ ok: true, format: "group" });
  });

  // @trace FR-INTAKE-02
  // @trace BC-FORMAT-01
  it("rejects 'unsure' with FORMAT_UNSURE — the caller owes the format explanation and a re-ask, the state never advances on it", () => {
    expect(validateFormat("unsure")).toEqual({ ok: false, code: "FORMAT_UNSURE" });
  });

  // @trace FR-INTAKE-02
  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  it("rejects 'instrument' with SCOPE_VIOLATION — no instrument lesson is ever recorded as a format", () => {
    expect(validateFormat("instrument")).toEqual({ ok: false, code: "SCOPE_VIOLATION" });
  });
});
