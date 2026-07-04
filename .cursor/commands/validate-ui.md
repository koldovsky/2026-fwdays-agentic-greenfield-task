---
name: /validate-ui
id: validate-ui
category: QA
description: Open Playwright browser and validate UI/UX against OpenSpec specs and checklist
---

Validate UI/UX in a live Playwright browser.

**Read and follow the skill:** `.cursor/skills/playwright-ui-validation/SKILL.md`

**Input (optional):**
- Base URL (default `http://localhost:3000`)
- Routes to test (default `/`, `/book`)
- OpenSpec change name to map scenarios (default: latest or user-specified)

**Steps**

1. Ensure `npm run dev` is running in `fwdays` (port 3000).
2. Load the **playwright-ui-validation** skill and `checklist.md`.
3. If a change name is given, read `openspec/changes/<name>/specs/**/*.md` for scenarios to verify.
4. Execute the full workflow: navigate → snapshot → screenshot → two-pass form tests → responsive sizes → console check.
5. Produce the report template from the skill with PASS/FAIL per checklist item and spec scenarios.
6. File `BUG-UX-*` entries for S2+ defects with screenshot evidence.

**Output:** Markdown UX validation report. If all pass, state ready for `/opsx-archive` on the related change.
