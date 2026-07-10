# Harden the export honesty gate: server-enforced, mandatory tailoringId

## Why

The `bullets` baseline spec requires overclaim-risk bullets to be excluded from
export by default and never silently re-included (`FR-BULLETS-02`,
`BC-HONESTY-02`), and `NFR-SEC-04` requires the honesty controls to hold against
a crafted request, not just the honest client. The base
`server-side-export-gate` (T5 #8, committed `ca103fa`) added a persisted-text
membership check on `/api/export/{pdf,docx}`, but it was **additive**: it ran
only when the request carried a `tailoringId`. That left the control opt-in from
the untrusted request body.

**Defect (confirmed by adversarial review, 2 independent reviewers):** a paid,
authenticated caller could POST an export with **no `tailoringId`** and fall
back to shape-only validation, rendering arbitrary fabricated bullet text into
their own résumé. The in-session client always sends the id (from the
`persisted` stream event), so the hole is invisible in normal UX and reachable
only by a direct or replayed POST — exactly the boundary T5 #8 set out to close.
Harm is self-directed (the caller's own résumé), but it defeats the product's
core honesty promise and leaves the requirement unmet.

The engaged path was found sound (IDOR → 404 with no existence leak, status →
400, membership covers exactly the generated-bullet fields, opted-in overclaim
bullets correctly preserved) — only the opt-out needed closing.

**User decision (2026-07-10):** make `tailoringId` mandatory for bullet-bearing
authenticated exports. Cross-tailoring "superset smuggling" (an export not bound
to the specific run/JD being viewed) is accepted as a documented residual, not
addressed here.

## What Changes

- The export honesty gate is **MANDATORY**, not opt-in: an authenticated export
  request that carries any pipeline-authored bullet text MUST name its
  `tailoringId`; a bullet-bearing export with a missing / empty / non-string
  `tailoringId` is rejected `400 missing_tailoring`. A document with no bullet
  text has nothing to ground and passes (paywall + shape gates still apply).
- Trade-off accepted: a paid caller whose tailoring row failed to persist (rare
  infra error → no `tailoringId`) can no longer export — the honesty-preserving
  outcome (Vouch will not render a résumé it cannot vouch for).
- Membership stays a text-MEMBERSHIP check, NOT an `included` filter, so a
  legitimately re-included overclaim-risk bullet (`FR-BULLETS-02`) still exports.
- Profile fields (summary / skills / education / headline / contact) remain
  intentionally un-gated (candidate profile data, not generated claims) — now
  documented and test-pinned as a deliberate scope boundary.
- Forward guard: when inline bullet editing (`FR-EDIT-01/02`) ships, edited text
  must be persisted back (grounding `manual`) before export or the exact-match
  gate will reject it — recorded so the two features do not silently conflict.

## Impact

- Specs: `bullets` (delta below).
- Code: `src/app/api/export/lib/enforce-grounding.ts`,
  `src/app/api/export/{pdf,docx}/route.ts`,
  `src/shared/lib/export/membership-gate.ts` (docs only).
- Behavior change: exports without a valid `tailoringId` now fail closed. The
  in-session client is unaffected (always sends the id).
- No migration; the `bullets` table already persists every bullet's text.

> Note: the openspec CLI is not installed in this environment, so this change was
> authored and reviewed by hand; `openspec validate` was not run.
