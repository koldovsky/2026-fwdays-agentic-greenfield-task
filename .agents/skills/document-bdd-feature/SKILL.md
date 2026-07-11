---
name: document-bdd-feature
description: Record a video of a specific Playwright BDD test scenario from a Gherkin feature file and save it with a standardized kebab-case filename.
---

# Instructions

Use this skill when you need to record a video for a specific Playwright test that is defined in a Gherkin feature file. Run the test from the command line using a dedicated Playwright configuration that enables video recording and a fixed viewport, rather than changing the default project configuration.

Execute only the desired scenario by filtering on the test name with Playwright's `--grep` option. The recording configuration should create a browser context with:

* Fixed viewport: **1280x720** (16:9 HD; matches `frontend/playwright.config.ts` per D-05; avoids the HiDPI-scaling artifacts that produced the pixelation visible in the Phase 2 video)
* Video recording always on (mode: `'on'`; NOT `'retain-on-failure'` — the recording IS the deliverable, not the failure artifact)
* `slowMo: 750` (per D-03; produces a slower, easier-to-read demo cadence for the SPA's button clicks + form fills; the Playwright default speed is too fast for a human-readable video review. Was 500 in 02.1-04 (ADR 0011); 2026-07-06 user feedback raised it to 1000; 2026-07-07 settled back to 500; 2026-07-11 raised to 750 for a slower, more readable cadence.)
* Videos written to a **temporary** output directory (moved to `docs/videos/` by the rename step) so the repo is not polluted with raw recordings
* The recording command must set `ENABLE_DEMO_PAUSE=1` on the `npx` invocation (NOT on the webServer command — that env does not reach the test process). With it, the `frontend/tests/steps/_demo_pause.ts` helper takes effect and the `demoPause(page, ms, reason)` calls in the demo spec actually pause the test. Without it, the helper is a strict no-op and the recording rushes through ~4.6s of pause calls (the webm ends up ~2s shorter than the spec implies)

## Skill defaults

These defaults are MANDATORY (Phase 02.1 D-03 + D-05). Any edit to this skill or its recording config MUST preserve them; the D-06 BDD scenario (`backend/tests/bdd/test_documentation_video_dimensions.py`) asserts the resulting webm is exactly 1280x720 and ≥10s, so any drift will fail the suite.

```ts
// .agents/skills/document-bdd-feature/scripts/playwright.video.config.ts
use: {
  viewport:        { width: 1280, height: 720 },
  video:           { mode: 'on', size: { width: 1280, height: 720 } },
  launchOptions:   { slowMo: 750 },
  reducedMotion:   'reduce',  // calmer chooser + skeleton-loader transitions for the demo viewer
}
```

If a user needs a non-default value (e.g. a wide-screen recording for a 21:9 demo surface), they MUST override the config in a one-off copy at the call site, not edit this file.

Always close the page and browser context before the test exits so the video is finalized and written to disk.

## Workflow

1. **Identify the scenario.** Read the target `.feature` file and extract:
   - The **feature ID** from the `@feature:<feature id>` tag (e.g. `F1`, `F2`).
   - The **feature slug** — kebab-case of the `Feature:` line (e.g. `EPUB Upload & Validation` → `epub-upload-and-validation`).
   - The **scenario name** to pass to `--grep`.

2. **Determine the skill and output directory.** If the user has not specified a destination directory, the **default** output directory is:

   ```
   docs/videos/
   ```

   (matches the Phase 2 F2/F3 video location; do NOT pollute the repo with timestamps in `/tmp/` unless the user explicitly opts out via `DOCUMENT_BDD_FEATURE_OUTPUT_DIR=/tmp/some-dir`).

   If the user wants a different destination, **prompt explicitly**:

   ```
   Where should the recorded video be saved? (provide an absolute or repo-relative path; default: docs/videos/)
   ```

   Store the response as `OUTPUT_DIR` environment variable. Create it if it does not exist.
   Store skill directory as `DOCUMENT_BDD_FEATURE_DIR` environment variable.

3. **Run the test with the recording config.** From the `frontend/` directory, reference the config from this skill's `scripts/` directory:

   ```bash
   ENABLE_DEMO_PAUSE=1 npx playwright test \
     --config="$DOCUMENT_BDD_FEATURE_DIR/scripts/playwright.video.config.ts" \
     --grep "<scenario name>"
   ```

   `ENABLE_DEMO_PAUSE=1` is **mandatory** for the demo spec — `frontend/tests/steps/_demo_pause.ts` is a strict no-op without it, so the `demoPause(page, ms, reason)` calls in the spec file become byte-equivalent no-ops and the recording rushes through them (the demo spec's 4.6s of pause calls disappear, the webm is ~2s shorter than expected). Setting the env var on the webServer command does NOT propagate to the test process — it must live on the `npx` invocation.

   The config writes videos to a **temporary directory** (e.g. `/tmp/pw-video-record-<random>/`). This prevents accidental overwrites of repo files.
   Read the temporary directory name from console output and obtain the video file(s) names.

4. **Rename and move a documentation video.** After the test completes, use the provided TypeScript CLI script to rename and move the generated video:

   ```bash
   npx ts-node $DOCUMENT_BDD_FEATURE_DIR/scripts/rename-video.ts \
     --feature-id "<feature-id>" \
     --feature-name "<feature-slug>" \
     --source "<path-to-generated-video>" \
     --dest "$OUTPUT_DIR"
   ```

   The script renames the file to `<feature-id>-<feature-slug>-<YYYYMMDD-HHmmss>.webm` (UTC) and moves it to `$OUTPUT_DIR`.

5. **Clean up** the temporary Playwright output directory (the config's `outputDir`). The script prints the temp path after execution for cleanup.

## Examples

Assume a user prompt "Record the EPUB upload smoke scenario, saving to `./recordings/`", then execute:

```bash
npx playwright test \
  --config=scripts/playwright.video.config.ts \
  --grep "User submits an EPUB file through drag-drop"
```

Obrain the temporary video file name from console output, then:

```bash
npx ts-node scripts/rename-video.ts \
  --feature-id "F1" \
  --feature-name "epub-upload-and-validation" \
  --source "/tmp/pw-video-record-abc123/test.webm" \
  --dest "./recordings"
```

And remove the temporary directory.

The resulting video will be saved as `./recordings/F1-epub-upload-and-validation-20260705-143022.webm`.

## Configuration

The recording config lives at `scripts/playwright.video.config.ts` (within this skill directory — **not** in the project root). It sets a fixed **1280x720** viewport (per D-05 alignment with `frontend/playwright.config.ts`), enables video recording with matching dimensions (mode `'on'` per D-03), and applies `launchOptions.slowMo = 500` to produce a 2x-speed comprehensible recording. Output goes to a temporary directory to avoid polluting the repo with raw recordings; the rename step moves the final file to the chosen `OUTPUT_DIR`.

## CLI Script

The rename/move utility at `scripts/rename-video.ts` accepts:
- `--feature-id` — the feature tag value (e.g. `F1`)
- `--feature-name` — kebab-case feature slug
- `--source` — absolute path to the generated `.webm` file
- `--dest` — destination directory for the renamed file

## Visual recording enhancements

Quick 20260711-0910 added a mouse cursor + focus outline + trail overlay
to the recording pipeline so the demo videos show the user's intended
interaction surface (headless mode has no real OS cursor, so the
recording is a static DOM without these overlays). The overlay is
page-side — it never reaches the production SPA and never affects the
D-06 BDD dimension assertion (the webm is still exactly 1280x720, ≥10s).

### What the helper renders

* **Mouse cursor** — 18px cyan circle with a 2px solid border. The
  border turns red on `mousedown` for click feedback.
* **Trail** — 10px cyan dot, fades over 500ms, removed after 650ms.
  Smoothed by `page.mouse.move(x, y, { steps: 8 })` calls in your
  test actions (Playwright's mouse API supports interpolated
  movement steps).
* **Focus outline** — 3px solid orange outline + 4px halo on the
  currently focused element. The orange contrasts with the cyan
  cursor so focus + cursor do not blend when they overlap.

### Opt-in pattern

The helper is OFF by default. To enable it for a recording session,
the spec file must import the extended `test` from
`scripts/visual-helper-fixture.ts`:

```ts
// before
import { test, expect } from '@playwright/test';

// after
import { test, expect } from '<skill-dir>/scripts/visual-helper-fixture';
```

The fixture calls `context.addInitScript({ path: <visual-helper.js> })`
in `beforeEach`, so the helper is registered before any page script
runs. The `addInitScript()` API applies to every page and child frame
in the context — no per-page boilerplate.

### Files

* `scripts/visual-helper.js` — the compiled helper (self-contained
  IIFE; no module imports). This is what `addInitScript({ path })`
  loads.
* `scripts/visual-helper-fixture.ts` — exports an extended `test`
  that re-exports `expect` from `@playwright/test` and adds a
  `beforeEach` that calls `context.addInitScript({ path: ... })`
  on every test.
* `scripts/playwright.video.config.ts` — unchanged in behavior; the
  top-of-file comment points at the new fixture for discoverability.

### Why a fixture and not `use.contextOptions`?

`addInitScript` is a method on `BrowserContext`, not a Playwright
config option. The config has no `addInitScript` key. The canonical
way to inject a script for every test is a custom fixture that the
spec file imports — this matches Playwright's own
[BrowserContext](https://playwright.dev/docs/api/class-browsercontext)
documentation recommendation.

### Why a `DOMContentLoaded` wrapper and not `addInitScript({ path })` directly?

`addInitScript({ path })` evaluates the script "after the document
was created but before any of its scripts were run" (per
[Playwright docs](https://playwright.dev/docs/api/class-browsercontext)).
The visual-helper.js IIFE touches `document.head` and
`document.documentElement` at the top level — but the parser has
not always created these nodes when the init script runs, so the
calls throw a TypeError ("Cannot read properties of null
(reading 'appendChild')"). Playwright swallows init-script
errors silently, so the failure is invisible. The cursor never
renders, the test still passes (no assertion covers this), and
the recording shows no cursor.

The fixture therefore reads the helper source at fixture-load
time and injects it as an inline `<script>` tag inside a
`DOMContentLoaded` listener. The wrapper guarantees `<head>` and
`<html>` exist before the helper touches them. Spike 007 in
`.planning/spikes/007-cursor-rendering-location/` captures the
investigation trail (three Playwright probes: direct addInitScript,
deferred via DCL, inline `<script>`) and the verdict.
