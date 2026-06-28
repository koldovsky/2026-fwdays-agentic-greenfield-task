## 1. Persistence layer

- [x] 1.1 Define `DEFAULT_SETTINGS` (FR-SETTINGS-03) — in `lib/settings/settings.ts` (pure core, per AGENTS rule #1) rather than co-located with storage
- [x] 1.2 Implement `loadSettings()` with default-merge and try/catch fallback (FR-SETTINGS-02, FR-SETTINGS-03) — `src/storage/settings.ts` delegating to pure `parseStoredSettings`/`normalizeSettings`
- [x] 1.3 Implement `saveSettings(settings)` writing `break-reminder:settings`
- [x] 1.4 Add validation for `"HH:MM"` and interval/snooze bounds — in `normalizeSettings` (also guards inverted windows, working-day junk, non-boolean flags)

## 2. Settings UI — RELOCATED to `add-app-shell`

The Settings view (editable fields, client state + persist, recompute-on-change)
depends on the shell's DESIGN.md tokens and navigation, so it moved to
`add-app-shell` (tasks 4.1–4.3; requirements FR-SETTINGS-01 / FR-SETTINGS-04).
This change ships only the framework-free storage core below.

## 3. Tests & verify

- [x] 3.1 Unit-test `loadSettings`/`saveSettings` (defaults, round-trip, corrupt JSON) — `lib/settings/settings.test.ts` (node) + `src/storage/settings.test.ts` (jsdom); 28/28 green
- [x] 3.2 Verify the shipped scope: `npm test` green (28/28); `eslint lib/ src/` clean. (Full repo `lint`/`typecheck`/`build` remain blocked by pre-existing starter scaffold owned by `add-app-shell`.)
- [x] 3.3 Run `npx openspec validate add-settings --strict` — passes
