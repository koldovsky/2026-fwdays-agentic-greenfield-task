## Why

The `lib/` modules and the popup export flow (`popup-wiring`) are covered by 63 Vitest unit tests, but nothing exercises the extension as a whole in a real browser: loading unpacked, driving the popup through its four states, and asserting that a real export lands the right folder/files on disk with anonymization applied. `docs/requirements.md` §4 and the tech stack table both call for a Playwright E2E layer against the live reference ticket [ROVODEV-36](https://jira.atlassian.com/browse/ROVODEV-36). This change adds that harness. It doubles as the source for the homework demo recording (`video: 'on'`).

## What Changes

- Add `@playwright/test` as a dev dependency and a `test:e2e` script (plus a `test:e2e:report` helper). No production dependency changes — this is test-only tooling (NFR-02 unaffected).
- Add `app/playwright.config.ts` configured to launch a real Chromium with the unpacked extension via `launchPersistentContext` + `--load-extension=<dist>` / `--disable-extensions-except=<dist>`, headed (extension loading is unreliable headless — documented in requirements §3), with `video: 'on'` and a `test-results/` output for the demo recording.
- Add `app/e2e/export.spec.ts` that: loads the built extension, opens the popup, navigates to the live ROVODEV-36 ticket, clicks Export, and asserts the popup reaches success and the `Downloads/ROVODEV-36/` folder contains the `.md` (with anonymized `UserN` content and Cyrillic-preserving name) and a `media/` subfolder with `NN-` prefixed files. The test points `chrome.downloads` at a controlled temp directory so assertions read from a known path.
- Add a small `app/e2e/README.md`-level note (in the spec/tasks, not a stray doc) on the prerequisites: `npm run build` first, `npx playwright install chromium`, and headed run.
- Configure Vitest to only collect unit tests under `src/` so the Playwright specs under `e2e/` are not picked up by `npm run test` (they use the Playwright runner, not Vitest).
- Gitignore Playwright artifacts (`test-results/`, `playwright-report/`, downloaded fixtures).

Out of scope: changing any product behavior; the demo video file itself and the PR write-up (homework wrap-up, done by a human); testing trackers other than Jira.

## Capabilities

### New Capabilities
- `e2e-verification`: an automated, browser-level verification that the packaged extension performs a real export end-to-end (popup states, folder/file layout, media prefixes, anonymization) against the live reference ticket.

## Impact

- New dev dependency `@playwright/test`; new `app/playwright.config.ts`, `app/e2e/` spec(s).
- `app/package.json`: `test:e2e` script + devDependency; `app/vitest.config.ts` added to scope unit runs to `src/`.
- `.gitignore`: Playwright output directories.
- No changes to `app/src/`, `manifest.json` permissions, or `docs/requirements.md` (implements the already-`accepted` testing requirements in §4 and the E2E rows of §3).
- Running the harness requires a real headed Chromium + network access to the live ticket, so the actual run and the resulting demo recording are a manual/human step (the scaffold lands here; execution is documented in tasks).
