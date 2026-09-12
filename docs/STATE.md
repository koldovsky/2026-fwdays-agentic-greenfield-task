# Project State

Last updated: 2026-07-04 (playwright-e2e archived; E2E passing + demo video script)

## Plan
- [x] Product docs — `docs/product-brief.md`, `docs/requirements.md` (FR-01…FR-21, NFR-01…NFR-07), `docs/DESIGN.md`
- [x] Agent rules — `AGENTS.md`, imported by `CLAUDE.md`
- [x] E2E test cases — `docs/e2e-test-cases.md` (TC-01…TC-17, traced to FR/NFR)
- [x] OpenSpec adopted — `openspec/` (schema spec-driven), `.claude/commands/opsx/*`
- [x] Scaffold extension in `app/` — Vite + CRXJS, MV3, TS strict, Pico CSS (OpenSpec change `scaffold-extension`, archived)
- [x] Toolbar icon "md" (SVG → 16/32/48/128, graphite + azure arrow per DESIGN.md)
- [x] Popup UI shell: 4 states per DESIGN.md (FR-05…FR-09) — wired to real export flow (`popup-wiring`)
- [x] Fill Commands section in `AGENTS.md` (build/lint/typecheck/test, all <60s combined)
- [x] Jira DOM parser — `app/src/lib/jira-parser/` (archived, 21 Vitest tests)
- [x] Markdown serializer — `app/src/lib/markdown-serializer/` (archived, 39 Vitest tests)
- [x] Anonymizer — `app/src/lib/anonymizer/` (archived, 51 Vitest tests)
- [x] Popup wiring + downloads flow — `popup-wiring` (archived, 20/21 tasks): full export flow via `chrome.scripting` + `chrome.downloads`; FR-04…FR-18, FR-12 partial-success. Task 6.2 (manual unpacked verification) remains optional — E2E now covers the live ticket path.
- [x] Playwright E2E harness — `playwright-e2e` (archived, 14/17 tasks done): headed suite passes against live ROVODEV-36 (~4s). E2E build (`npm run build:e2e`) adds Jira host permission; content-based assertions (GUID on-disk names under Playwright). `npm run test:e2e:demo` records via `recordVideo` → `app/demo/ticket2md-export.webm`. New capability spec `e2e-verification`. Remaining: trim demo video (5.3), PR (homework wrap-up).
- [ ] Homework wrap-up: trim `app/demo/ticket2md-export.webm` to 1–2 min, PR with template + practices description

## Next step
Trim `app/demo/ticket2md-export.webm` to 1–2 min (QuickTime/iMovie/etc.), then open the homework PR using the repo template.

## Notes
- E2E prerequisites: Node 20.19+ (`app/.nvmrc`), `npm install`, Chromium for Playwright (`npx playwright install chromium` or use existing cache via `PLAYWRIGHT_BROWSERS_PATH`).
- Production `npm run build` keeps minimal permissions; always use `npm run build:e2e` before `test:e2e` / `test:e2e:demo`.
- Under Playwright, on-disk download names are GUIDs — real Chrome manual export still produces `Downloads/<KEY>/` layout; folder naming is unit-tested via `buildExportPaths`.
- Resolve `proposed` items in requirements.md as they get confirmed (FR-04, FR-14, FR-20, NFR-04, product name).
- `examples/` HTML fixture is tracked; `examples/*_files/` sidecar stays gitignored.
