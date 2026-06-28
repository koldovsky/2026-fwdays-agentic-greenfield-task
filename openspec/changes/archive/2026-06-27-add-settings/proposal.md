## Why

The reminder engine needs a configured `Settings` object, and the user needs to edit
it. This capability makes settings persistent, gives calm first-run defaults, and
recomputes the next reminder the moment anything changes (FR-SETTINGS-01…04).

## What Changes

- Add a thin persistence layer `src/storage/settings.ts` over `localStorage`, key
  `break-reminder:settings` (FR-SETTINGS-02).
- Apply first-run defaults when no settings are stored: 09:00–18:00, Mon–Fri,
  interval 60, snooze 5, enabled, sound on (FR-SETTINGS-03).
- Add a Settings view to edit `workStart`, `workEnd`, `workingDays`, `intervalMinutes`,
  `snoozeMinutes`, `enabled`, `soundEnabled` (FR-SETTINGS-01).
- Any change immediately recomputes the next reminder via the engine (FR-SETTINGS-04).

## Capabilities

### New Capabilities
- `settings`: load/save/validate the user's reminder settings and surface a calm editing UI.

### Modified Capabilities
<!-- none -->

## Impact

- New code: `src/storage/settings.ts`, settings UI under `src/components/` + `src/app/`.
- Depends on `reminder-engine` (`lib/types.ts` `Settings` type, `computeNextReminder`).
- Persistence is `localStorage` only (TC-STACK-03, BC-PRIVACY-01); no network.
