## 1. Tooling & scoping

- [x] 1.1 Add `@playwright/test` to `app/package.json` devDependencies and a `test:e2e` (+ `test:e2e:report`) script
- [x] 1.2 Add `app/vitest.config.ts` scoping unit runs to `src/**/*.test.ts` so `npm run test` never collects the Playwright `e2e/*.spec.ts`
- [x] 1.3 Gitignore Playwright artifacts: `test-results/`, `playwright-report/`, `app/demo/*.webm`

## 2. Harness config

- [x] 2.1 Add `app/playwright.config.ts`: headed Chromium, `testDir: './e2e'`, trace/screenshot artifacts, output to `test-results/`
- [x] 2.2 Launch via `launchPersistentContext` with `--load-extension` pointed at `app/dist/` (E2E build via `npm run build:e2e`), `recordVideo` on the context (config `use.video` does not apply to manual persistent contexts), deterministic extension id from manifest `key` (`jkkdkcmamdondchhjdnhdkocfchdlcjg`)

## 3. Export spec

- [x] 3.1 Fail fast if `app/dist/` is missing or lacks E2E host permission (prompt to `npm run build:e2e`)
- [x] 3.2 Open popup + locally served ROVODEV-36 fixture tab, assert Export enabled and `data-state="success"` (FR-04…FR-07)
- [x] 3.3 Assert export via `chrome.downloads.search()` — completed `text/markdown` item exists (Playwright saves on-disk files as GUIDs; FR-15/FR-16 folder layout covered by `buildExportPaths` unit tests)
- [x] 3.4 Assert Markdown content: ticket key, `UserN` aliases, no real names in body or download paths (FR-10, FR-19); `getActiveTab()` skips `chrome-extension://` tabs (Playwright opens popup as a tab)
- [ ] 3.5 Assert success-with-caveats on failed attachment (FR-12) — still pending; fixture ticket has no attachments to exercise partial media failure in E2E

## 4. Verification (scaffold)

- [x] 4.1 Unit toolchain green with harness present (63 Vitest tests, NFR-06)
- [x] 4.2 Vitest does not collect `e2e/*.spec.ts`
- [x] 4.3 E2E passes headed against the local ROVODEV-36 fixture (`npm run build:e2e && npm run test:e2e`, set `PLAYWRIGHT_BROWSERS_PATH` if Chromium is in `~/Library/Caches/ms-playwright`)

## 5. Demo video & archive

- [x] 5.1 `@playwright/test` installed; Chromium available locally
- [x] 5.2 `npm run test:e2e:demo` — builds E2E variant, runs the suite, copies the newest `.webm` to `app/demo/ticket2md-export.webm`
- [ ] 5.3 Trim `app/demo/ticket2md-export.webm` to 1–2 min for the homework demo (human edit — not automatable here)
- [ ] 5.4 Re-archive or sync `playwright-e2e` specs after review fixes land (change already archived; canonical spec lives in `openspec/specs/e2e-verification/`)
