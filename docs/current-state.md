# Current state

> Running snapshot of where the work stands. Read this first at the start of a
> session; update it after any meaningful action. Format and rules: see
> `AGENTS.md` → "Session continuity". This is a snapshot, not a changelog —
> overwrite stale entries.

**Last updated:** 2026-06-27T19:53:18Z

## What was just done

- **maker≠checker pass completed** (separate review session, did not trust the
  author). Checked all 6 living specs against the suite on the four AGENTS.md
  criteria. Result: pure domain logic is fully and exactly covered; the gaps are
  UI/IO scenarios verified only in the browser. Harness re-run green throughout.
  - **Criterion 2 (no time logic leaked / framework-free): PASS.** No zero-arg
    `new Date()`, no `Date.now()`, no `react`/`next`/DOM/`localStorage`/`indexedDB`
    in `lib/` (only doc-comment mentions). `from: Date` is the sole "now".
  - **Criterion 3 (mutation gate): PASS.** Disabled the snap-to-`workStart`
    branch in `schedule.ts` → AC-REMIND-05 turned red; reverted → 58/58 green.
  - **Criterion 4 (UI follows DESIGN.md): PASS.** No raw hex in components;
    `signal` confined to the due state (`DueBreakCard`, `BreathingRing` due map;
    `StatsView` references it only to exclude it); `motion-reduce:` on ring pulse
    and arc transition; `STROKE_BY_STATE` = idle→accent, due→signal, disabled→muted.
  - **Criterion 1 (every scenario has a test with exact spec I/O): PARTIAL.**
    Pure-lib scenarios match spec values exactly (reminder-engine AC-REMIND-01..09,
    settings normalize/parse, stats AC-STATS-01/02, notify due-detection, ring,
    sound melody schedules). Deviations = scenarios with no automated test, today
    covered only by the recorded browser verification:
    - DEV-01 (settings, FR-SETTINGS-04) "Interval change updates the next
      reminder" — recompute-on-change lives in `settingsStore`; no unit test.
    - DEV-02 (notify) "Sound off stays silent" — the `soundEnabled` gate is in the
      caller; `sound.test.ts` calls `playReminderSound` directly, never the gate.
    - DEV-03 (notify) permission scenarios "No prompt on load" / "Prompt on
      enabling" / "Denied still nudges" — `src/notify/notifications.ts` wiring,
      browser-verified only.
    - DEV-04 (stats, FR-STATS-01) "Done/Snooze action is recorded" —
      `recordBreakEvent` (Dexie) has no test (jsdom has no IndexedDB).
    - DEV-05 (shell, pwa) navigation, narrow-viewport, first-run intro,
      reduced-motion, manifest, offline shell — UI/SW, browser-verified only.
  - Handing DEV-01..05 back for a separate fix pass. DEV-01/02 are cheap pure-ish
    unit tests and the highest-value gaps to close first.

## What was done earlier

- Added selectable reminder sounds:
  - `Settings` now includes `soundChoice: "ping" | "melody-10" | "melody-30"`,
    defaulting old/missing storage to `"ping"` while keeping `soundEnabled` as the
    on/off toggle.
  - Settings UI now has a three-option sound style segmented control: Ping,
    Melody 10 sec, Melody 30 sec.
  - `src/notify/sound.ts` now plays the selected local Web Audio sound: existing
    short ping, a 10 second melody, or a 30 second melody. No assets/network.
  - Updated requirements + living OpenSpec settings/notify specs. Added tests for
    sound normalization/storage and Web Audio scheduling. Full harness green:
    lint, typecheck, 58 tests, webpack build, OpenSpec strict validation, and
    Fallow audit.

- Cleaned up Fallow audit findings; `npx fallow audit` is green:
  - Added `.fallowrc.json` with `app/sw.ts` as an explicit entrypoint because
    Serwist loads it through `swSrc`, outside the normal import graph.
  - Made `notificationsSupported` file-local instead of an unused export.
  - Added targeted Fallow complexity suppressions for small React UI functions
    whose CRAP scores are estimated without coverage, with inline reasons.
  - Full harness green: lint, typecheck, 54 tests, webpack build, OpenSpec strict
    validation, and Fallow audit.

## What was done earlier

- Implemented `add-pwa` (10/10 tasks), harness green, browser-verified:
  - Brand icons in `public/brand/` (pause glyph on accent; 192/512 PNG generated
    from `icon.svg`) + Next-native `app/manifest.ts` (name, icons, theme color,
    `display: standalone`).
  - Serwist SW: `app/sw.ts` (precache shell + minimal custom `runtimeCaching`;
    deliberately NOT `defaultCache` to avoid Background Sync; no push handler),
    `next.config.ts` wrapped with `withSerwistInit` (disabled in dev).
  - BUILD PIPELINE CHANGE: `@serwist/next` needs webpack, so `build` script is now
    `next build --webpack` (dev stays Turbopack). Excluded `app/sw.ts` from tsc +
    eslint (webworker globals, Serwist-compiled); gitignored generated `public/sw.js`.
  - Browser verify (`next start` + Chrome): manifest served with 4 icons +
    standalone; SW `activated` + controlling; offline reload → full shell renders
    from cache (FR-PWA-02); `pushSubscription: none`. 54/54 tests; lint/typecheck/
    build/validate green.
  - CAVEAT (FR-PWA-03): the serwist bundle still contains an unused BackgroundSync
    `Queue` class (dead code, never constructed); no sync handler registers at
    runtime and we never call `sync.register()`.
- New deps: `serwist` + `@serwist/next` (^9.5.11) (TC-STACK-05).

## What was done earlier

- Implemented `add-stats` (11/11 tasks), harness green, browser-verified:
  - Pure `lib/stats/stats.ts` — `aggregateStats(events, range)` (totals + sparse
    per-day `byDay`, half-open range) + `weekRange(now)`; types `BreakEvent`,
    `DayStats`, `StatsSummary`, `DateRange` in `lib/types.ts`. 5 tests incl.
    AC-STATS-01/02 + mutation gate.
  - `src/storage/events.ts` — Dexie `break-reminder` DB, `events` table
    (`++id, timestamp, type`), `recordBreakEvent` (write never throws).
  - `AppShell` due-card actions now record a `BreakEvent` ("done"/"snoozed") then
    reschedule. `StatsView` rewritten: `useLiveQuery` → `aggregateStats` → calm
    weekly bar chart (done=`accent`, snoozed=muted, never `signal`) + friendly
    empty state.
  - Browser verify (Playwright + clock mock): empty → invitation; one break →
    "Done 1"; second break while Stats open → "Done 2" reactively (no reload,
    proves `useLiveQuery`); no errors. 54/54 tests; lint/typecheck/build/validate green.

## What was done earlier

- Implemented `add-notify` (11/11 tasks), harness green, browser-verified:
  - Pure due-detection `lib/notify/due.ts` (`isDue`, `shouldFire` once-per-target) + 9 tests.
  - `src/notify/notifications.ts` (Notification API wrapper; permission only on the
    enable action; unsupported/denied → card-only, no error) and `src/notify/sound.ts`
    (Web Audio chime, gated by `soundEnabled`, failures swallowed).
  - `src/components/DueBreakCard.tsx` — signal-colored card with "Took a break" /
    "Snooze {n} min" (the card is the source of truth; Notification mirrors it).
  - Store reschedule actions `markBreakDone` / `snoozeBreak` in `settingsStore`;
    `clockStore` re-ticks on `visibilitychange`. `AppShell` derives `due` (no
    setState in the fire effect — ref + side effects only) and requests permission
    only when the user toggles reminders ON.
  - Browser verification (Playwright + clock mock): granted → card + Notification +
    "Snooze 5 min" + "Took a break" reschedules; denied → card-only, 0 notifications,
    no errors; permission requests 0 at load → 1 on enable. 49/49 tests; lint,
    typecheck, build, `openspec validate --all --strict` all green.
- NOTE: constructor Notifications can't carry action buttons (needs a service
  worker, out of scope FR-PWA-03), so the two actions live on the in-app card and
  the Notification is a plain mirror nudge.

## What was done earlier

- Implemented `add-app-shell` (17/17 tasks):
  - Still Water `@theme` tokens + Fraunces/Inter via `next/font/google`
    (`app/globals.css`, `app/layout.tsx`); read Next 16 App Router docs first.
  - Shell + quiet bottom nav + Settings view + ring, wired to the shipped storage
    core. Single-screen client app: `src/components/{AppShell,BreathingRing,
    MainView,SettingsView,StatsView}.tsx`, `app/page.tsx` renders `<AppShell/>`.
  - Pure ring helpers `lib/ring/ring.ts` (+ 12 tests). Total 40/40 green.
  - React 19 `set-state-in-effect` avoided via `useSyncExternalStore` stores:
    `src/storage/{settingsStore,clockStore}.ts` (no mount effect, SSR-safe).
    Recompute-on-change (FR-SETTINGS-04) lives in the settings store.
  - HARNESS NOW FULLY GREEN: lint + typecheck + test + `next build` all pass.
- Removed the stale repo-root `types/` dir (untracked, Next-generated dupes of
  `.next/types/`) — it was the sole cause of the long-standing repo-wide
  lint/typecheck/build failures. Next regenerates validators into the gitignored
  `.next/types/`. (User approved the deletion.)

## What was done earlier

- Implemented + archived the `add-settings` STORAGE CORE:
  - `lib/settings/settings.ts` — `DEFAULT_SETTINGS` + pure `normalizeSettings` /
    `parseStoredSettings` (default-merge, `"HH:MM"` + bounds validation, inverted-
    window guard, working-day cleanup). `src/storage/settings.ts` — thin
    `loadSettings`/`saveSettings` over `localStorage` key `break-reminder:settings`.
  - Tests: `lib/settings/settings.test.ts` (node) + `src/storage/settings.test.ts`
    (jsdom). Added `@`→repo-root alias + `src/**` include to `vitest.config.ts`.
    28/28 green; `eslint lib/ src/` clean.
- DESCOPED the Settings *view* out of `add-settings` (user chose "archive as-is"):
  - Relocated FR-SETTINGS-01/04 (editable fields + recompute-on-change) into
    `add-app-shell` — new `specs/settings/spec.md` (delta to `settings` capability)
    + tasks 4.1–4.3; updated its proposal's Modified Capabilities.
  - Trimmed `add-settings` delta to the shipped persistence + defaults requirements.
- Synced + archived: created `openspec/specs/settings/spec.md`; moved change to
  `openspec/changes/archive/2026-06-27-add-settings`. `openspec validate --all
  --strict` → 7 passed.

## Active work

- **Phase:** 🎉 FEATURE-COMPLETE. All 6 capabilities implemented + archived. No
  active changes. Living specs of record: `reminder-engine`, `settings`, `shell`,
  `notify`, `stats`, `pwa` (in `openspec/specs/`). Full harness green
  (lint/typecheck/54 tests/webpack build) + `openspec validate --all --strict`.
- **Active changes remaining:** none.

## Implementation order (by dependency) — ALL DONE

1. `add-reminder-engine` — pure core — ✅ done + archived
2. `add-settings` — storage core — ✅ done + archived (view → shell)
3. `add-app-shell` — shell, nav, ring, tokens, **+ Settings view** — ✅ done + archived
4. `add-notify` — Notification API + due-break card + actions — ✅ done + archived
5. `add-stats` — Dexie events + pure `aggregateStats` + calm chart — ✅ done + archived
6. `add-pwa` — Serwist manifest + offline shell — ✅ done + archived

## Next step

- No capability work left. Optional follow-ups (NOT capabilities):
  - Deploy to Vercel (TC-DEPLOY-01); run a formal Lighthouse PWA/perf check on the
    production HTTPS URL (NFR-PERF-01, NFR-A11Y-01).
  - Record the 1–2 min demo (BC-DEMO-01).
  - maker≠checker review pass: ✅ DONE (see "What was just done"). Optional fix
    pass to close deviations DEV-01..05 — start with DEV-01 (settings recompute)
    and DEV-02 (sound-off gate), the cheapest pure-ish unit tests.

## Open questions / blockers

- BUILD SETUP (dual bundler, intentional): `next dev` uses **Turbopack**; the
  production `npm run build` uses **webpack** (`next build --webpack`) because
  `@serwist/next` injects a webpack config. `next.config.ts` sets an empty
  `turbopack: {}` so Next 16 doesn't error on the coexisting webpack config during
  dev. Don't "simplify" by removing either the `--webpack` flag or `turbopack: {}`.
- `workingDays` encoding resolved: engine uses `Date.getDay()` (0=Sun…6=Sat).
- Repo-wide harness is GREEN (lint + typecheck + test + build, 49/49). The stale
  repo-root `types/` dir was deleted; Next regenerates validators into the
  gitignored `.next/types/`. If `next dev`/`build` ever re-emits a tracked
  `types/`, re-check this.
- The next-reminder target is anchored at app start / last settings change /
  last break action. `notify` now owns firing + rescheduling (`markBreakDone` /
  `snoozeBreak`); `stats` will hook those same actions to record `BreakEvent`s.
