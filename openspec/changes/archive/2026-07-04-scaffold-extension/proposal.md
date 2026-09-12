## Why

`app/` does not exist yet — there is no buildable extension, so none of the other planned work (Jira parser, serializer, anonymizer, popup wiring, E2E) has anywhere to land. This change establishes the buildable, loadable MV3 shell so subsequent changes can each focus on one concern instead of also inventing project scaffolding.

## What Changes

- Scaffold `app/` with Vite + CRXJS, TypeScript strict mode, MV3 `manifest.json` requesting only `activeTab`, `scripting`, `downloads` (NFR-04).
- Wire Pico CSS into the popup via CSS variables only (no hardcoded colors, no UI framework) (NFR-05).
- Build the popup as a **static** 4-state shell per `docs/DESIGN.md`: idle, in-progress, success, error (FR-05–FR-08). States are visually complete but not wired to real extraction/download logic — no chrome.downloads calls, no DOM parsing yet. State switching in this change is driven by placeholder/dev-only triggers, to be replaced when `popup-wiring` lands.
- Add the toolbar icon ("md") in the required sizes (16/32/48/128).
- Confirm the extension loads unpacked in Chrome (`chrome://extensions` → Load unpacked) with no console errors (NFR-06).
- Record the working build/test/lint/type-check commands in `AGENTS.md` § Commands.

Out of scope for this change: Jira DOM parsing (FR-01–FR-03, FR-10), Markdown serialization (FR-10, FR-13, FR-14), anonymization (FR-19–FR-21), `chrome.downloads` wiring (FR-11, FR-15–FR-18), and Playwright E2E — each is a separate planned change.

## Capabilities

### New Capabilities
- `popup-shell`: the static, 4-state popup UI (idle/in-progress/success/error) built with vanilla TS + Pico CSS, matching `docs/DESIGN.md`, with no business logic wired in yet.

### Modified Capabilities
(none — first change in the repo, no existing specs to modify)

## Impact

- New directory `app/` (Vite + CRXJS project: `manifest.json`, `popup/`, build config, `tsconfig.json`).
- New icon assets (`app/icons/` or equivalent, 16/32/48/128 px).
- `AGENTS.md` § Commands gets filled in with real build/test/lint/type-check commands.
- No changes to `docs/requirements.md` — this change implements existing `accepted` requirements (FR-05–FR-09, NFR-04, NFR-05) and does not introduce or alter any FR/NFR.
