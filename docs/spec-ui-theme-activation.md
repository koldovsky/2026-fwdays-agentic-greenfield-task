# Feature Spec: Report Theme Toggle and Element Activation Fix

Last updated: 2026-07-10

## 1) Context

- Problem: Report usability issues were found in manual QA.
- For whom: Web users exploring tree nodes and previews in report mode.
- Current behavior before this slice:
  - No light/dark theme toggle in report view.
  - Element activation worked from node name only; thumbnail activation was inconsistent.
  - Viewer metadata could show PNG URL instead of STL URL.
  - Viewer thumbnail fallback behavior was not explicit for failed PNG loads.
- Domain/API constraints:
  - Keep lazy asset endpoint contract unchanged: `/asset/<sid>/<side>/<encoded_path>.{stl,png}`.
  - Keep report i18n contract for `uk`, `en`, `da`.

## 2) Requirements

### Functional

- [x] Add light/dark theme toggle in report toolbar.
- [x] Persist chosen theme in browser localStorage (`reportTheme`).
- [x] Enable element activation from both node name and node thumbnail.
- [x] Viewer metadata shows STL URL, not PNG URL.
- [x] Viewer thumbnail uses fallback placeholder on PNG load error.

### Non-functional

- [x] Performance: no change to lazy asset generation model.
- [x] Security/privacy: no new server endpoints and no new sensitive state.
- [x] Localization: toggle labels translated in `uk`, `en`, `da`.
- [x] DX/maintainability: activation behavior centralized in one JS function.

## 3) Scope

- In scope:
  - `src/report.py` (CSS + JS + report toolbar controls)
  - `src/i18n.py` (theme strings)
  - `tests/test_app.py` (report markup checks)
- Out of scope:
  - Full design system refactor for all pages
  - Server-side theme persistence

## 4) Acceptance Criteria

- [x] AC-1: Report displays a theme toggle control.
- [x] AC-2: Theme persists after page reload in the same browser.
- [x] AC-3: Clicking either node name or thumbnail activates element in viewer.
- [x] AC-4: Viewer metadata field for STL shows STL endpoint URL.
- [x] AC-5: Existing test suite remains green.

## 5) Test Plan

- Unit:
  - i18n keys exist for theme labels in all supported languages.
- Integration:
  - Report HTML includes `theme-toggle`, `data-stl-url`, and thumbnail activation markup.
- Smoke/manual:
  - Upload sample fixtures in web UI, open report, toggle theme, click both name and thumbnail.

## 6) Implementation Plan (small slice)

- Slice name: ui-theme-and-activation
- Files touched:
  - `src/report.py`
  - `src/i18n.py`
  - `tests/test_app.py`
- Risks:
  - Browser caching may keep old report JS until hard reload.
- Rollback strategy:
  - Revert report JS/CSS additions and i18n keys.

## 7) Checker Plan (Maker != Checker)

- Maker agent: implementation in report/i18n/tests.
- Checker agent(s):
  - Code quality: `pytest -q`
  - Spec compliance: AC-1..AC-5 validation
  - UX/text quality: manual report click-through
- External review:
  - CodeRabbit: optional
  - Complexity/dead code: optional

## 8) Result Summary

- What was done:
  - Added theme toggle with localStorage persistence.
  - Fixed activation so both node name and thumbnail open selected element.
  - Corrected viewer metadata to show STL URL and hardened PNG fallback handling.
  - Extended report smoke tests for new markup.
- Which checks passed:
  - `\.venv\Scripts\python.exe -m pytest -q` -> `30 passed, 6 warnings`
- What was intentionally deferred:
  - Global theming across upload/error pages
  - Theme sync across multiple tabs/windows
