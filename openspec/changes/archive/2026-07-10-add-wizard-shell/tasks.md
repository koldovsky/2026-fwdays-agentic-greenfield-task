## 1. Design tokens and typography

- [x] 1.1 Add wizard CSS variables (bg `#F5F6F8`, surface, border, text, muted, accent `#3D5A80`) on the docs route or shared wizard styles
- [x] 1.2 Load IBM Plex Sans or Source Sans 3 via `next/font` and apply to the wizard shell
- [x] 1.3 Style primary/secondary buttons with 4–6px radius (not pills) using the accent token

## 2. Wizard shell UI

- [x] 2.1 Create client `WizardShell` (e.g. `app/docs/[guid]/wizard-shell.tsx`) accepting `guid`, initial `current-step`, and `completed`
- [x] 2.2 Render progress circles 1…7 with current / past / future visual states (FR-18, NFR-02)
- [x] 2.3 Render «Назад» / «Далі» with edge rules: no Back on step 1; no Next on step 7 unfinished (FR-17)
- [x] 2.4 Render stub step panel content for steps 1–7 (titles + placeholders) as replaceable slots
- [x] 2.5 Disable nav controls while a step PATCH is pending; show save errors without advancing (NFR-10)

## 3. Persist step and wire page

- [x] 3.1 On successful Back/Next, `PATCH /api/docs/[guid]` with `{ "current-step": next }` then refresh; keep same `guid` (NFR-04)
- [x] 3.2 Replace stub UI on `/docs/[guid]` with `WizardShell` for unfinished sessions; keep error panels and JSON export
- [x] 3.3 For `completed === true`, keep final-review presentation (step 7 semantics) without unfinished Mid-flow Next completing the session
- [x] 3.4 Remove `SessionStubControls` (or stop rendering it) so step changes go only through the shell

## 4. Verification

- [x] 4.1 Manually verify TC-20: circles reflect current step; Back/Next work across steps 1–7 with edge limits
- [x] 4.2 Manually verify TC-21: navigate to step 4, reload `/docs/{guid}`, resume on step 4 with same guid
- [x] 4.3 Spot-check local Next/Back feels snappy (< 300 ms target on local FS) (NFR-09)
- [x] 4.4 Update `docs/current-state.md` with wizard-shell status and next focus (`document-type`)
