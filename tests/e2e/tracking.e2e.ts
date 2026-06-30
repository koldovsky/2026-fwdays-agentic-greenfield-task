// Growth + watering + charts E2E (Phase 5). On a plant detail page, log a
// measurement and a watering, confirm they appear in their date-desc lists, and
// assert both chart regions render (we assert the labelled <figure> is present
// — jsdom/Playwright don't validate pixels; vision-verify is Phase 6). The UI is
// Ukrainian — we query by the real uk copy.
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-02
// @trace FR-WATER-01
// @trace FR-WATER-03
// @trace FR-CHART-01
// @trace FR-CHART-02
import { test, expect } from "@playwright/test";

import { uk } from "@/lib/i18n/uk";
import { reseed } from "./helpers/e2e-db";

let healthyId: number;

test.beforeEach(async () => {
  const ids = await reseed();
  healthyId = ids.healthy;
});

test("@trace FR-GROWTH-01/02 + FR-CHART-02 logging a measurement adds it to the list and the growth chart renders", async ({
  page,
}) => {
  await page.goto(`/plants/${healthyId}`);

  // The growth chart figure renders (the seed gave this plant measurements).
  await expect(
    page.getByRole("figure", { name: uk.charts.growthTitle }),
  ).toBeVisible();

  // Log a new measurement via the add form. The height input is a tolerant
  // text field; the date defaults to today.
  const uniqueHeight = "37,3"; // decimal comma -> parsed to 37.3 (SC: comma input)
  await page.getByLabel(uk.growth.heightLabel).fill(uniqueHeight);
  await page.getByRole("button", { name: uk.growth.add }).click();

  // It appears in the measurements list as "37.3 см" (one decimal, dot display).
  await expect(
    page.getByText(`37.3 ${uk.growth.heightUnit}`),
  ).toBeVisible();
});

test("@trace FR-WATER-01/03 + FR-CHART-01 logging a watering adds it to the list and the watering chart renders", async ({
  page,
}) => {
  await page.goto(`/plants/${healthyId}`);

  // The watering chart figure renders (the seed gave this plant waterings).
  await expect(
    page.getByRole("figure", { name: uk.charts.wateringTitle }),
  ).toBeVisible();

  // Log a watering with a distinctive note (date defaults to today).
  const note = `E2E полив ${Date.now()}`;
  await page.getByLabel(uk.watering.noteLabel).fill(note);
  await page.getByRole("button", { name: uk.watering.add }).click();

  // It appears in the waterings list (the note is shown verbatim).
  await expect(page.getByText(note)).toBeVisible();
});
