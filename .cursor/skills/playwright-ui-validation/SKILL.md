---
name: playwright-ui-validation
description: >-
  Opens the app in a live Playwright browser and validates UI/UX against OpenSpec
  scenarios and PRD requirements. Use when the user asks to validate UI, review UX,
  check the landing page, test forms visually, run Playwright browser validation,
  or verify a change before archive.
---

# Playwright UI/UX Validation

Validate Colibri Book (or specified URLs) in a **live browser** via the **`user-playwright` MCP**.
Always read MCP tool schemas from `mcps/user-playwright/tools/` before calling.

## Prerequisites

1. **Dev server** — default base URL `http://localhost:3000`
   ```bash
   # Check terminals folder; if not running:
   cd fwdays && npm run dev
   ```
   For **CI/regression gate**, use automated Playwright (pattern from lab-test-booking):
   ```bash
   npx playwright install chromium   # once
   npm run test:e2e                  # landing + booking-intake + a11y
   ```
2. **Context** — read before validating:
   - Active OpenSpec change specs: `openspec/changes/<change>/specs/**/*.md`
   - PRD: `docs/requirements.md` (NFR-A11Y-01, FR-* for the feature)
   - Optional: `openspec validate <change> --strict`

## Workflow

```
1. Prep     → dev server up, identify routes + spec scenarios to verify
2. Open     → browser_navigate to each route
3. Observe  → browser_snapshot + browser_take_screenshot
4. Interact → forms, nav, keyboard (see Two-Pass below)
5. Diagnose → browser_console_messages on failures
6. Report   → structured UX report (template below)
```

### Step 1 — Routes (Colibri defaults)

| Route | What to validate |
| ----- | ---------------- |
| `/` | Colibri logo (transparent, no checkerboard box), hero copy, CTA to `/book`, header nav |
| `/book` | Facility selector, all intake fields, disclosure, validation errors, confirm step |

Add routes as the app grows. User may override base URL or path list.

### Step 2 — Open browser

```text
CallMcpTool server=user-playwright toolName=browser_navigate
  arguments: { "url": "http://localhost:3000" }
```

Repeat for each route. After navigation, always `browser_snapshot`.

### Step 3 — Visual / UX checklist

Use [checklist.md](checklist.md). For each item: PASS | FAIL | N/A + evidence.

Minimum checks every run:

- Logo renders without opaque/checkerboard background on gradient
- Primary CTA visible and navigates correctly
- Typography readable; no overflow/clipping at 1280px and 390px width
- Focus rings visible when tabbing (`browser_press_key` Tab)
- Form labels present; errors use `role="alert"` / aria-describedby
- Empty submit shows field-specific errors (not one generic blob)
- Valid fill reaches confirm step; MHOA submit disabled with explanation
- No unexpected console errors (`browser_console_messages`)

### Step 4 — Responsive passes

```text
browser_resize { width: 390, height: 844 }   # mobile
browser_snapshot → screenshot

browser_resize { width: 768, height: 1024 }  # tablet
browser_snapshot → screenshot

browser_resize { width: 1280, height: 800 }  # desktop
browser_snapshot → screenshot
```

### Step 5 — Two-pass form interaction (mandatory for forms)

| Pass | Tools | Purpose |
| ---- | ----- | ------- |
| **Pass 1 — Real input** | `browser_click` + `browser_type` on refs from fresh snapshot | Blur, change, input events; validation UX |
| **Pass 2 — Programmatic** | `browser_fill_form` or `browser_click` by ref | Accessibility tree, hidden DOM |

If passes **disagree**, log both results; trust **Pass 1** for UX truth.

**Booking intake happy path (Pass 1):**

1. Navigate `/book`
2. Select Tennis Courts
3. Fill: name, email, phone, address, NL request (≥10 chars)
4. Check attestation checkbox
5. Click "Review booking request"
6. Expect confirm panel with disabled "Submit to MHOA"

**Negative path:** Submit empty → expect ≥1 field error; focus first invalid field.

### Step 6 — Map results to specs

For each OpenSpec scenario under test, record:

```markdown
| Scenario | Result | Evidence |
| -------- | ------ | -------- |
| Missing full name → field error | PASS | snapshot ref |
```

Link failures to `BUG-UX-NNN` if defect-worthy.

## Report template

```markdown
# UI/UX Validation — <date>

**Base URL:** http://localhost:3000
**Change / scope:** add-booking-intake
**Browser:** user-playwright MCP

## Summary
- Routes tested: /, /book
- Result: X pass / Y fail / Z blocked

## Findings

### UX-001 — <title> (S3)
**Route:** /book
**Expected:** …
**Actual:** …
**Evidence:** screenshot / console log

## Spec scenario coverage
| Requirement | Scenarios checked | Status |
| ----------- | ------------------- | ------ |

## Console
<paste errors or "clean">

## Recommendations
1. …
```

## Severity (UX)

| Level | Example |
| ----- | ------- |
| **S1** | Core flow broken, page crash |
| **S2** | CTA/form blocked, wrong navigation |
| **S3** | Validation/a11y/brand defect |
| **S4** | Cosmetic spacing, copy polish |

## Tool reference

| Task | MCP tool |
| ---- | -------- |
| Go to URL | `browser_navigate` |
| DOM / a11y tree | `browser_snapshot` |
| Screenshot | `browser_take_screenshot` |
| Click | `browser_click` |
| Real typing | `browser_type` |
| Fast fill | `browser_fill_form` |
| Keyboard | `browser_press_key` |
| Viewport | `browser_resize` |
| Console | `browser_console_messages` |
| iframe / complex DOM | `browser_run_code_unsafe` (use sparingly) |

MCP validation (`user-playwright`) is for **exploratory UX review**.
The **`npm run test:e2e`** suite (see `tests/e2e/`, `playwright.config.ts`) is the
regression gate — required before OpenSpec archive per
`.cursor/rules/openspec-change-testing.mdc`.

## When to stop

- S1 on primary flow → report immediately, do not continue
- Dev server unreachable → start it or mark BLOCKED
- MCP unavailable → report; do not substitute headless CLI unless user asks

## Additional resources

- Full checklist: [checklist.md](checklist.md)
