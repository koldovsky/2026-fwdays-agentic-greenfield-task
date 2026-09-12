## 1. Project setup

- [x] 1.1 Scaffold `app/` with Vite + CRXJS, TypeScript strict mode (`tsconfig.json`)
- [x] 1.2 Add `manifest.json` (MV3) requesting only `activeTab`, `scripting`, `downloads` (NFR-04)
- [x] 1.3 Add `lib/` folder inside `app/` as the framework-free boundary for future parser/serializer/anonymizer work (no Chrome API imports allowed there)
- [x] 1.4 Wire Pico CSS into the popup build (CSS variables only, no hardcoded colors)

## 2. Toolbar icon

- [x] 2.1 Create placeholder "md" wordmark icon
- [x] 2.2 Export icon at 16/32/48/128 px and reference all four sizes in `manifest.json`

## 3. Popup shell (static, 4 states)

- [x] 3.1 Build idle state: title "Export ticket to MD", checked-by-default anonymization checkbox, Export button (FR-05)
- [x] 3.2 Build in-progress state: loader, replacing idle controls (FR-06)
- [x] 3.3 Build success state: export-succeeded confirmation message (FR-07)
- [x] 3.4 Build error state: error message + details area (FR-08)
- [x] 3.5 Confirm the anonymization checkbox never introduces a state beyond these four (FR-09)
- [x] 3.6 Add a dev-only affordance to switch between the 4 states for manual/visual review (no `chrome.downloads` calls, no DOM parsing) — mark clearly as temporary, to be removed in `popup-wiring`

## 4. Verification

- [x] 4.1 Load the built extension unpacked in Chrome (`chrome://extensions` → Load unpacked); confirm no console errors (NFR-06) — confirmed manually by user, console empty
- [x] 4.2 Visually confirm all 4 popup states match `docs/DESIGN.md` — confirmed manually by user via dev-toggle in `npm run dev`
- [x] 4.3 Record the working build / lint / type-check commands in `AGENTS.md` § Commands (each must run under 60s per NFR-06)
- [x] 4.4 Run `openspec validate scaffold-extension` (or equivalent) and confirm the change is apply-clean
