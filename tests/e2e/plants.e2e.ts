// Plant-lifecycle E2E (Phase 5). Add -> appears -> open detail -> edit ->
// delete-with-confirm -> gone, end to end through the real UI, plus the inline
// validation paths (blank name / future date / bad interval) showing an error
// without a crash. The UI is Ukrainian — we query by the real uk copy.
//
// @trace FR-PLANT-01
// @trace FR-PLANT-05
// @trace FR-PLANT-06
// @trace FR-PLANT-07
// @trace FR-SHELL-03
// @trace FR-REM-01
import { test, expect } from "@playwright/test";

import { uk } from "@/lib/i18n/uk";
import { reseed } from "./helpers/e2e-db";

test.beforeEach(async () => {
  await reseed();
});

// A unique-enough name per run so a leftover row from a prior failed run never
// collides (we still re-pin the demo baseline, but this plant is bespoke).
function uniqueName() {
  return `E2E Тестова рослина ${Date.now()}`;
}

test("@trace FR-PLANT-01/05/06/07 full add -> view -> edit -> delete lifecycle", async ({
  page,
}) => {
  const name = uniqueName();
  const editedName = `${name} (оновлено)`;

  // ADD (FR-PLANT-01, FR-REM-01: interval field).
  await page.goto("/plants/new");
  await page.getByLabel(uk.plants.nameLabel).fill(name);
  await page.getByLabel(uk.plants.speciesLabel).fill("Crassula ovata");
  await page.getByLabel(uk.plants.intervalLabel).fill("5");
  await page.getByRole("button", { name: uk.plants.save }).click();

  // The form navigates to the list on success; the new plant card appears.
  await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();

  // OPEN DETAIL (FR-PLANT-05) — click the card link.
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

  // EDIT (FR-PLANT-06).
  await page.getByRole("link", { name: uk.plants.edit }).click();
  await expect(
    page.getByRole("heading", { name: uk.plants.editTitle }),
  ).toBeVisible();
  await page.getByLabel(uk.plants.nameLabel).fill(editedName);
  await page.getByRole("button", { name: uk.plants.save }).click();

  // Back on detail with the new name.
  await expect(
    page.getByRole("heading", { name: editedName, level: 1 }),
  ).toBeVisible();

  // DELETE WITH CONFIRM (FR-PLANT-07) — first click reveals confirm, then confirm.
  await page.getByRole("button", { name: uk.plants.delete }).click();
  await expect(page.getByText(uk.plants.deleteConfirmPrompt)).toBeVisible();
  await page.getByRole("button", { name: uk.plants.deleteConfirm }).click();

  // Navigates back to the list; the plant is gone.
  await expect(
    page.getByRole("heading", { name: uk.plants.listTitle, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: editedName, level: 2 }),
  ).toHaveCount(0);
});

test("@trace FR-SHELL-03 blank name shows an inline error, no crash", async ({
  page,
}) => {
  await page.goto("/plants/new");
  // Leave name blank; submit.
  await page.getByRole("button", { name: uk.plants.save }).click();

  await expect(
    page.getByText(uk.plants.fieldErrors.nameRequired),
  ).toBeVisible();
  // Still on the form (no navigation, no crash).
  await expect(
    page.getByRole("heading", { name: uk.plants.addTitle }),
  ).toBeVisible();
});

test("@trace FR-SHELL-03/FR-REM-01 a bad interval shows an inline error", async ({
  page,
}) => {
  await page.goto("/plants/new");
  await page.getByLabel(uk.plants.nameLabel).fill(uniqueName());
  // 0 is not a positive integer -> intervalInvalid. The native number input
  // rejects non-numeric text, so use a sub-minimum value to exercise the
  // server-side validator path deterministically.
  await page.getByLabel(uk.plants.intervalLabel).fill("0");
  await page.getByRole("button", { name: uk.plants.save }).click();

  await expect(
    page.getByText(uk.plants.fieldErrors.intervalInvalid),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: uk.plants.addTitle }),
  ).toBeVisible();
});

test("@trace FR-SHELL-03 a future acquired date shows an inline error", async ({
  page,
}) => {
  await page.goto("/plants/new");
  await page.getByLabel(uk.plants.nameLabel).fill(uniqueName());
  // A clearly-future date (next year) — the validator rejects acquired dates
  // after today (SC-2). The native date input accepts the typed value.
  const nextYear = new Date().getFullYear() + 1;
  await page.getByLabel(uk.plants.acquiredDateLabel).fill(`${nextYear}-12-31`);
  await page.getByRole("button", { name: uk.plants.save }).click();

  await expect(
    page.getByText(uk.plants.fieldErrors.acquiredDateFuture),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: uk.plants.addTitle }),
  ).toBeVisible();
});
