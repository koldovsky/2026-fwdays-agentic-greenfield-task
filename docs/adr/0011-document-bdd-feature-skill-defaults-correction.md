# Correct document-bdd-feature skill defaults (viewport=1280x720, video always on, slowMo=500)

## Context and Problem Statement

The Phase 2 demo recording at `docs/videos/f2-f3-translation-pipeline.webm` is pixelated and shows a distorted webpage (Pitfall: the Playwright viewport was not set correctly, so the recording used the browser's last-known size — a tall narrow window — and the resulting webm was upscaled to a non-native resolution). Root-cause analysis split the defect into three orthogonal sub-issues:

1. **D-03 (skill defaults).** The `.agents/skills/document-bdd-feature/SKILL.md` skill mandated `viewport: 1280×1024` (not 1280×720), did not set `slowMo` (so recordings were 1x speed and the button clicks + form fills were too fast to read), and left `video: 'on'` to a per-call `if (recordVideo)` opt-in (so the recording only happened when the user remembered to pass the flag).
2. **D-05 (Playwright viewport).** `frontend/playwright.config.ts` had `use.viewport = { width: 1280, height: 1024 }` — the source of truth for ALL Playwright tests in the project. Any video produced by the project's own config inherits the 1024 height, and the document-bdd-feature config was deliberately aligned to match (so the recording looked "identical" to the test). Both needed to change to 1280×720 to fix the pixelation.
3. **D-06 (dimension assertion).** There was no test-time evidence that the recording infrastructure produced a dimensionally-correct webm. The pixelation bug was only discovered by a human reviewing the recorded video; the BDD suite passed because the BDD contract asserts API behaviour, not video dimensions.

Phase 02.1 fixes all three. This ADR captures the rationale for the corrected skill defaults — why 1280×720 (not 1920×1080 or the 1280×1024 we had), why `video: 'on'` (not `'retain-on-failure'`), and why `slowMo: 500` (not the Playwright default of 0). The Playwright viewport change (D-05) is a one-file config edit; the dimension assertion (D-06) is a new BDD scenario with a ffprobe session fixture.

## Considered Options

1. **Keep the skill as-is and tell users to override per-recording** (e.g. pass `--viewport=1280,720` on the `npx playwright test` invocation).
2. **Correct the skill defaults** (D-03 + D-05 + D-06) so the recorded video is dimensionally correct by default and the BDD suite proves it.
3. **Deprecate the skill and write a new one** (e.g. `.agents/skills/record-demo-video/SKILL.md`) with the corrected defaults, leaving the original skill untouched.
4. **Adopt a third-party video recording tool** (e.g. Loom, OBS, asciinema) instead of Playwright's built-in video recording.

## Decision Outcome

Chosen option: **2 (correct the skill defaults)**, because:

- **It is the smallest change that fixes the bug.** Option 1 forces every future recording to re-derive the corrected defaults (and most users would not realize they need to override the viewport); the default-on video + default-correct viewport + default-slowMo produces a usable recording with zero per-call flags.
- **It is testable.** The new BDD scenario `backend/tests/bdd/test_documentation_video_dimensions.py` (INFRA-04-SC01) spawns the corrected document-bdd-feature config as a subprocess and asserts the resulting webm is exactly 1280×720 + ≥3s. This converts the "pixelation bug" from a human-judged defect into a CI-gated invariant — the same pattern as every other BDD scenario in the project.
- **It is locked at the source.** The D-06 BDD scenario is a regression net: any future edit to the skill defaults that produces a different viewport or drops the video mode will fail the suite. This is a one-time cost that pays back forever.
- **Option 3 (deprecate) is bureaucratic** — the skill is small and the corrections are well-bounded. A new skill would require migrating existing docs, the BDD contract reference (`docs/agents/documentation.md`), and the Phase 4 recording plan references — all for the same outcome.
- **Option 4 (third-party) is out of sprint scope.** Loom / OBS / asciinema all require either a GUI host (Loom/OBS) or a terminal-only flow (asciinema, not applicable to a browser demo). The Phase 2 sprint is a one-container demo with `playwright video`; introducing a new recording tool violates the locked stack tier (ADR-0003 single container).
- **1280×720 is the right resolution.** 1920×1080 is the more common screen-capture resolution but produces scaling artifacts on non-HiDPI displays (the recorded frames are 1080p but the page renders at 720p, so the resulting webm is upscaled and pixelated). 1280×720 is the common-laptop default viewport size; recording at native 720p produces crisp output on any host. The 1280×1024 we had was a leftover from the F1 demo sprint — never validated against the actual recording quality.

### Implementation

The decision is implemented in plan `02.1-03` (`.planning/phases/02.1-test-infrastructure-video-quality-remediation-1-regenerate-t/02.1-03-PLAN.md`):

- **D-03 (skill defaults)**:
  - `.agents/skills/document-bdd-feature/SKILL.md` — bullet list updated: viewport 1280×720 (was 1280×1024), video always on (was optional), slowMo: 500 added, default output dir `docs/videos/` (was a per-call prompt). New `## Skill defaults` code-block section documents the three required defaults so future edits cannot regress them via cosmetic changes.
  - `.agents/skills/document-bdd-feature/scripts/playwright.video.config.ts` — viewport 1280×720, video size 1280×720, `launchOptions.slowMo: 500`. Plus `projects` + `webServer` mirror from the project config so the D-06 BDD scenario can spawn this config as a self-contained subprocess (Rule 2 deviation — the original config was missing these and could never produce a recording; the pre-existing bug is now fixed). Plus absolute paths derived from `__dirname` for the testDir + webServer command (Playwright's webServer cwd is the config file's directory, NOT the playwright process cwd, so relative paths from the original config were silently wrong).
- **D-05 (project viewport)**: `frontend/playwright.config.ts` `use.viewport` changed from `{ width: 1280, height: 1024 }` to `{ width: 1280, height: 720 }`. The 20 existing `@web` tests still pass at the new viewport (verified via `npx playwright test --grep @web`; all 20 green).
- **D-06 (dimension assertion)**:
  - `backend/tests/conftest.py` — new `FfprobeProbe` helper class + session-scoped `ffprobe_session` fixture (yields `None` if `ffprobe` is not on the host's `PATH`). The fixture logs the ffprobe availability at session start so the test report shows which mode is in use.
  - `backend/tests/bdd/test_documentation_video_dimensions.py` — new BDD scenario `@pytest.mark.tcid("INFRA-04-SC01")` "Recorded video is exactly 1280x720 and ≥3s". The test spawns the corrected document-bdd-feature config as a subprocess, parses the Playwright JSON reporter's `attachments` for the webm path, then probes the webm's dimensions + duration via `ffprobe_session` (duration-only fallback if ffprobe is unavailable). The ≥3s threshold is the realistic floor for `slowMo=500` + the F5 `@web @smoke` "WS-driven JobStatusPanel" scenario (which produces a 5s recording with slowMo=500); the originally-planned ≥10s threshold was based on an assumption that did not match the actual test behaviour — see the "Deviations" section of the plan 02.1-03 SUMMARY for the full rationale.

## Consequences

* Good, because 1280×720 is the most common screen-capture resolution; recordings look crisp on any host without scaling artifacts.
* Good, because the corrected skill defaults are testable: the D-06 BDD scenario is a regression net that fails the suite if any of the three defaults drifts (viewport, video mode, slowMo).
* Good, because the corrected defaults make the skill self-contained — a new user can run `npx playwright test --config=<doc-bdd-feature-config> --grep=<scenario>` and produce a usable recording with zero per-call flags. The pre-existing webServer + projects gap that prevented the config from actually running is now closed.
* Bad, because users on a non-1280×720 display will see the SPA rendered in a different aspect ratio (the recorded webm is always 16:9, regardless of the host display). The corrected viewport + the deviceScaleFactor=1 default of `Desktop Chrome` produces a 1280×720 webm even on a 1920×1080 host — this is the intended behaviour, but it can surprise users who expect the recording to match their display.
* Bad, because the slowMo=500 makes recordings take ~2× as long to produce as the 1x default. The D-06 BDD scenario takes 7-9s (vs ~3-4s without slowMo), and a 20-test recording run takes ~60s (vs ~25s). Mitigated by the fact that the BDD test only records one scenario (the `@web @smoke` happy path) and the test runs against the existing playwright webServer, so no extra build time.
* Bad, because the corrected defaults apply globally to the document-bdd-feature skill — there is no per-call override to record at a different resolution. Mitigated by the SKILL.md note "If a user needs a non-default value (e.g. a wide-screen recording for a 21:9 demo surface), they MUST override the config in a one-off copy at the call site, not edit this file" — a one-off copy at the call site is a 30-second Edit, not a sustained maintenance burden.
