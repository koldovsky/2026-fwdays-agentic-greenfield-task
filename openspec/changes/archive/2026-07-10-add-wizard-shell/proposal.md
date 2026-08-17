## Why

Document sessions exist, but `/docs/{guid}` still has stub step controls without shared wizard chrome. Every later step capability needs one navigation shell: progress circles 1–7, Back/Next with edge rules, and `current-step` kept in sync with the session. This is phase 3 after `document-session` and the shared frame for all step UIs.

## What Changes

- Replace stub session UI with a wizard shell on `/docs/{guid}` for unfinished sessions
- Show progress as numbered circles 1…7 with current step highlighted (FR-18, NFR-02)
- Provide Назад / Далі navigation with first/last step edge limits (FR-17)
- Persist `current-step` on navigation via the existing session PATCH API so reload resumes the same step
- Apply the neutral financial palette and UI tokens from DESIGN.md (NFR-01)
- Keep step bodies as stubs (placeholder content per step); real step forms belong to later capabilities
- Target local step transitions under 300 ms on already-loaded session data (NFR-09)

## Capabilities

### New Capabilities
- `wizard-shell`: Shared 7-step wizard chrome over a document session — progress circles, Back/Next, step persistence, and neutral financial UI

### Modified Capabilities
- _(none)_ — `document-session` already exposes `current-step` read/patch; this change consumes that contract without changing its requirements

## Impact

- Client UI on `app/docs/[guid]/`: wizard layout, progress, nav controls; remove or fold stub PATCH controls into the shell
- Design tokens / CSS variables from DESIGN.md (background, surfaces, accent, typography)
- Depends on shipped `document-session` (`GET`/`PATCH /api/docs/[guid]`, session JSON with `current-step`)
- Downstream: `document-type`, `document-numbering`, `contacts`, `services-catalog` plug step content into this shell
- Non-goals (BC-02, BC-03, BC-08): no auth, no ЕДО, no legal compliance guarantees
- Out of scope here: real step forms/validation, numbering, contacts, services, templates, PDF, copy-from-guid
