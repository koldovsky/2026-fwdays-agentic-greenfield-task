# Tasks — harden-export-gate

## 1. Make the honesty gate mandatory (server)
- [x] 1.1 `enforce-grounding.ts`: accept `tailoringId: string | null`; add the
  `missing_tailoring` verdict (→ 400). No bullet text → `ok`; bullets present +
  `null` id → `missing_tailoring`; else existing IDOR/status/membership.
- [x] 1.2 `pdf` + `docx` routes: normalize `tailoringId` (empty / non-string →
  null); past the paywall call `enforceExportGrounding` unconditionally; drop the
  `tailoringId`-present conditional. Update route comments.

## 2. Adjacent guards (docs)
- [x] 2.1 `membership-gate.ts`: document that profile fields (summary/skills/
  education/headline/contact) are intentionally un-gated (deliberate scope).
- [x] 2.2 `membership-gate.ts`: FR-EDIT-01/02 forward guard — persist edited text
  back (grounding `manual`) before edit ships, or exact-match rejects it.

## 3. Tests (independent test-author)
- [x] 3.1 Update `enforce-grounding.test.ts` + pdf/docx `route.test.ts` for the
  mandatory behavior: bullet-bearing + absent `tailoringId` → 400
  `missing_tailoring`, no DB call; bulletless + absent id → 200 (nothing to
  ground). Empty-string / non-string id treated as absent.
- [x] 3.2 Keep IDOR → 404, status → 400, ungrounded → 400, and opt-in-overclaim
  allowed cases green.
- [x] 3.3 Add a case proving a fabricated `summary`/`skills` value passes the gate
  un-checked (documents the profile-field scope boundary).

## 4. Verify
- [x] 4.1 `yarn lint` + full test suite green (148 files, 1488 tests); checker
  (opus) sign-off on IDOR/membership/opt-in preservation and the fail-closed
  behavior (approve-with-nits, nits resolved).
