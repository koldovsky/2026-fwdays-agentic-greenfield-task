## Context

`document-session` and `wizard-shell` are shipped. New sessions default to `doc-type: invoice_act` and open on step 1, but the step body is still a stub. Step 1 must become the real type picker (and optional copy-from-guid) so later capabilities can branch on type.

Constraints: reuse existing session JSON + `PATCH /api/docs/[guid]`; keep wizard chrome; kebab-case keys (NFR-13); Ukrainian UI labels per DESIGN.md; no auth.

## Goals / Non-Goals

**Goals:**
- Step 1 UI: choose `invoice_act` | `invoice` | `act` with `invoice_act` preselected (FR-03)
- Persist `doc-type` before leaving step 1 (and on change) so reload keeps the choice (NFR-03, NFR-04)
- Optional copy from another session guid: copy business fields, never numbers; record `copied-from` (FR-04, BC-11)
- Clear error if source guid is invalid/missing (align with TC-25 tone)
- Update wizard-shell so step 1 is real content; steps 2–7 remain stubs

**Non-Goals:**
- Issuing invoice/act numbers (document-numbering)
- Changing which wizard steps exist based on type (still 1–7 chrome; type only affects later fill/PDF)
- Auth, ЕДО, contracts/waybills/VAT invoice types (BC-01, BC-02, BC-03, BC-08)
- Auto-advance after copy; user still uses «Далі»

## Decisions

### 1. Step 1 as a client component inside the shell
Extract `DocumentTypeStep` (client) rendered when `current-step === 1` (and session unfinished). Shell keeps progress + Назад/Далі; step owns radios, copy field, and local validation.

**Why:** Matches existing `WizardShell` client pattern; avoids remounting chrome on every type change.

**Alternative:** Server Action form — rejected for consistency with shell’s fetch+PATCH navigation.

### 2. Persist type via existing PATCH
On radio change and/or before «Далі», `PATCH` `{ "doc-type": ... }`. Prefer save-on-change so reload mid-step keeps selection; «Далі» also ensures latest type is written (same wait-for-PATCH pattern as step navigation).

**Why:** Session already supports `doc-type` in `DocumentSessionPatch`; no new endpoint for type alone.

### 3. Copy-from as a store helper + thin API
Add `copySessionFields(targetGuid, sourceGuid)` in `lib/document-session` that:
- Reads source; fails if missing/invalid
- Merges into target: `doc-type`, `date`, `client`, `done-by`, `services` (deep copy)
- Omits / clears `invoice-number`, `act-number`
- Sets `copied-from` to source guid
- Does **not** change target `guid`, `current-step`, or `completed`
- Updates `updated-at`

Expose via `POST /api/docs/[guid]/copy` with body `{ "source-guid": "..." }` (or PATCH with a reserved action). Prefer dedicated POST so copy semantics stay explicit and do not look like a partial field patch.

**Why:** FR-04 is a multi-field merge with invariants (BC-11); better as one atomic write than many client PATCHes.

**Alternative:** Client reads source via GET and PATCHes fields — rejected (race-prone, easy to forget clearing numbers).

### 4. What “copy all data except numbers” means now
At step 1, contacts/services may be empty on both sessions. Still copy whatever is present so FR-04 works when copying a finished or mid-flow session. Numbers always stripped even if present on source.

Type from source overwrites target’s `doc-type` (user can re-select after copy). UI shows source type after successful copy.

### 5. Labels (Ukrainian)
- `invoice_act` → «Рахунок + акт»
- `invoice` → «Рахунок»
- `act` → «Акт»

Copy control: text field for source guid + action «Скопіювати» (or equivalent). Empty guid = no copy attempt.

### 6. Validation before «Далі»
Type is always set (default `invoice_act`), so «Далі» is always allowed for type. If copy field is non-empty but copy was not applied successfully, either block «Далі» with an error or ignore the field — **Decision:** require successful copy or clear the field; do not advance while a pending/failed copy guid is shown with an error.

### 7. TC implications for later steps
TC-04/TC-05 (“only invoice” / “both documents”) are fully proven at template-fill/pdf-export. This change records `doc-type` and documents the contract; smoke-check that session JSON reflects the choice. Numbering/PDF capabilities consume the field later.

## Risks / Trade-offs

- [Copy overwrites mid-filled target] → Mitigation: copy is opt-in; confirm via clear success/error messaging; only available on step 1 in this change
- [Partial TC-04/05 until PDF] → Mitigation: accept; assert persisted `doc-type`; full export behavior deferred
- [Invalid source guid UX] → Mitigation: reuse session-not-found messaging; do not mutate target on failure
- [Shell API growth] → Mitigation: pass session snapshot props into step component; keep PATCH/copy calls inside step or thin callbacks

## Migration Plan

- No data migration: existing sessions already have `doc-type: invoice_act`
- Deploy is additive (new UI + copy helper/route)
- Rollback: revert UI to stub; unused `copied-from` / copy route are harmless

## Open Questions

- None blocking: FR-04 is Should but included in this change (capabilities.md recommends finishing it in phase 4 rather than deferring)
