# Frontend Testing

BDD testing for the Next.js static-export SPA using **Playwright** + **Gherkin** feature files.

## Stack

- **Playwright** — browser automation for the static-export SPA.
- **Gherkin feature files** — the six `.feature` files in `docs/features/` are the shared acceptance contract (same files the backend pytest-bdd suite consumes).
- **Page Object Model (POM)** — each page/view gets a `<Feature>Locators` class (selectors) and a `<Feature>Page` class (interactions + assertions).

## Architecture: source → POM → feature → test steps

```
Page source (src/pages/**, src/components/**)
        │
        ▼
  POM classes (frontend/tests/pom/**)
   - Locators: data-testid / role selectors
   - Page: high-level actions + assertions
        │
        ▼
  Gherkin feature files (docs/features/*.feature)
        │
        ▼
  Step definitions (frontend/tests/steps/**)
   - Map Given/When/Then → POM method calls
```

## Workflow (bdd-testing skill)

The `.agents/skills/write-bdd-tests` skill orchestrates a planner → writer → verifier loop:

1. **Planner** reads the page source + Gherkin feature, produces a Test Plan (`docs/TEST-PLAN.md`).
2. **POM writer** generates `<Feature>Locators` and `<Feature>Page` classes from the page source.
3. **Test writer** maps feature-file scenarios to step definitions that call POM methods.
4. **Verifier** runs the tests, compares against the plan, and feeds improvement notes back until convergence (max 5 iterations).

## Running

```bash
# from frontend/
yarn playwright test                          # full suite
yarn playwright test --grep @smoke            # live demo slice
yarn playwright test --project=chromium       # single browser
yarn playwright test --headed                 # visible browser (debugging)
yarn playwright test --debug                  # step-through debugger
```

## Tag semantics

Frontend tests use the same tag vocabulary as the shared feature files:

| Tag | Meaning |
|---|---|
| `@web` | SPA / browser — this is the frontend layer |
| `@smoke` | live demo path (judges run this) |
| `@regression` | full CI gate |
| `@defer-combined` | combined-workflow scenarios; live demo skips |

## Conventions

- **Selectors**: prefer `data-testid`, then ARIA roles. Never rely on CSS class names or DOM position.
- **POM granularity**: one POM pair per feature file (e.g. `UploadPage` for `epub-upload-and-validation.feature`).
- **Step definitions**: one step file per feature, co-located under `frontend/tests/steps/`.
- **Assertions**: assert user-visible behavior (text, URL, visible elements), not internal React state.
- **Static export**: tests run against `yarn build` output served by the backend container — no SSR, no middleware.

## Pitfalls

- **No server runtime** — the SPA is fully static; do not write tests that depend on API routes or middleware.
- **Backend must be running** — Playwright tests hit the real FastAPI backend (mock providers); start it with `uv run uvicorn app.main:app` from `backend/` before running frontend tests.
- **Timing** — use Playwright's auto-wait assertions (`expect(locator).toBeVisible()`) instead of fixed `waitForTimeout` calls.
