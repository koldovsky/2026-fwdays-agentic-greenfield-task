# Test Scenario Tags

Tags serve **three purposes**: documentation, CI/CD pipeline slicing, and **test layer routing** (which runner executes this scenario).

Every scenario should have exactly **one tag from each dimension**:

```
Scenario = [test layer] + [execution scope]

Example: @api @smoke
         @web @regression
         @integration @wip
```

## Dimension 1: Test Layer (REQUIRED on every Scenario)

This is the most important tag — it tells the CI runner **which test harness** to use.

| Tag | Layer | When to use | Runner |
|---|---|---|---|
| `@web` | E2E / Browser | User-facing flows that require a browser — login screens, form submissions, UI state changes | Playwright + Cucumber |
| `@api` | API | Business logic verified via HTTP calls — no browser needed; the behavior is the API contract | REST client + Cucumber |
| `@integration` | Integration | Cross-service / cross-system flows — service A triggers something observable in service B | Multi-service test environment |

**Decision guide — which layer?**

Ask: *"Where does the core behavior live?"*

```
Business rule is enforced in the backend (validation, calculation, state machine)
  AND the scenario doesn't require seeing a UI element
  → @api

The user must interact through a browser (UI state, navigation, form rendering)
  OR the acceptance criterion is about what the user SEES on screen
  → @web

The scenario spans two separate services / systems
  (e.g., POS emits an event → accounting system receives it)
  → @integration
```

**Rule: never mix layers in one scenario.** If a scenario needs both browser interaction AND a service call side-effect, split into:
- `@web` scenario: verifies UI behavior
- `@integration` scenario: verifies downstream effect


## Dimension 2: Execution Scope (REQUIRED on every Scenario)

| Tag | When to use |
|---|---|
| `@smoke` | Happy path only — 1–2 per Rule max. Runs on every push. |
| `@regression` | All other scenarios. Runs on PR / nightly. |
| `@wip` | Under active development, expected to fail. Excluded from CI. |
| `@future` | Not yet implemented. Serves as living documentation. |
