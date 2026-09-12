## Context

The unit layer (Vitest on `lib/`) proves the pure logic; it cannot prove that the packaged MV3 extension loads, that `chrome.scripting`/`chrome.downloads` wiring works, or that a real export produces correct Markdown on a live ticket. `docs/requirements.md` §3–§4 specify Playwright driving the unpacked build in a real Chrome against the public ticket ROVODEV-36. Chrome extensions load unreliably in headless mode, so the harness must run headed. This is also the intended source of the homework demo video.

## Goals / Non-Goals

**Goals:**
- A repeatable Playwright harness that loads the E2E `app/dist/` unpacked, drives the popup, and asserts export success + anonymized Markdown content — covering FR-05…FR-08, FR-10, FR-19 at the integration level.
- `recordVideo` on the persistent browser context so each run writes a `.webm` under `test-results/`; `npm run test:e2e:demo` copies it to `app/demo/ticket2md-export.webm` for trimming into the homework demo.
- Zero impact on the unit suite: `npm run test` (Vitest) stays green and fast (NFR-06); Playwright specs run only under `npm run test:e2e`.

**Non-Goals:**
- Running the harness in CI or headless (documented as headed-only).
- Producing the final edited demo video or the PR text (homework wrap-up, human).
- Mocking Jira — the test hits the live public ticket by design (FR-02 fidelity).
- Asserting on-disk `Downloads/<KEY>/` folder layout under Playwright (see Decisions §2).

## Decisions

### 1. `launchPersistentContext` with `--load-extension`, headed, E2E manifest variant
MV3 extensions require a persistent context and the `--disable-extensions-except` + `--load-extension` flag pair pointed at `app/dist/`. Production builds keep minimal permissions (`activeTab` only); the E2E build (`npm run build:e2e`, `TICKET2MD_E2E=1`) adds `host_permissions: ['https://jira.atlassian.com/*']` because `activeTab` is only granted by a real toolbar click, which automation cannot produce. The extension id is derived deterministically from the public `key` in `manifest.config.ts` (`jkkdkcmamdondchhjdnhdkocfchdlcjg`) — no background service worker needed.

### 2. Playwright download interception → content-based E2E assertions
Playwright intercepts `chrome.downloads` saves as GUID filenames on disk (and in `chrome.downloads.filename`), so the `Downloads/<KEY>/<KEY>-<title>.md` + `media/NN-` layout (FR-15…FR-18) cannot be asserted in E2E. Mitigation: unit tests on `buildExportPaths` + `planAttachmentNames` cover naming; E2E asserts via `chrome.downloads.search()` for a completed `text/markdown` item and reads the file bytes for ticket key + `UserN` aliases (FR-10, FR-19). `acceptDownloads: false` was rejected — it cancels extension downloads (`USER_CANCELED`).

### 3. Popup-as-tab workaround
Playwright opens the popup as a `chrome-extension://` tab, unlike a real toolbar popup. `getActiveTab()` in `popup.ts` skips `chrome-extension://` URLs so Export targets the Jira content tab. The E2E spec also calls `ticketPage.bringToFront()` before clicking Export.

### 4. Screen recording
`recordVideo: { dir: testInfo.outputDir, size: { width: 1280, height: 720 } }` on `launchPersistentContext` — config-level `use.video` does not apply to manually launched contexts. `scripts/export-demo-video.mjs` copies the newest `.webm` to `app/demo/ticket2md-export.webm` after `test:e2e:demo`.

### 5. Vitest scoping
`app/vitest.config.ts` with `test.include = ['src/**/*.test.ts']` so Vitest never runs Playwright specs.

## Risks / Trade-offs

- [Live ROVODEV-36 can change or attachment links expire] → Mitigation: assert Markdown content invariants; FR-12 caveats assertion (task 3.5) deferred when live ticket yields only the `.md` in Playwright.
- [Flaky progress state if attachment downloads hang] → Mitigation: `getActiveTab()` fix; re-run; future product timeout on per-download wait.
- [Chromium path in Cursor sandbox] → Mitigation: set `PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright` when browsers are installed there.
