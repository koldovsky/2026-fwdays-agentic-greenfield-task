import { chromium } from "playwright";

const TENNIS_URL = "https://mahoganyhoa.com/facilities/outdoor/tennis-courts-3/";

async function probe(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(TENNIS_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);

  for (const court of ["East Court", "West Court"] as const) {
    console.log(`\n--- ${date} / ${court} ---`);
    await page.locator("select").first().selectOption({ label: court });
    await page.waitForTimeout(1500);

    const selects = page.locator("select");
    const selectCount = await selects.count();
    console.log("select count:", selectCount);
    for (let i = 0; i < selectCount; i++) {
      const opts = await selects.nth(i).locator("option").allTextContents();
      console.log(`  select[${i}] options:`, opts.slice(0, 5).join("|"), opts.length > 5 ? "..." : "");
    }

    await selects.nth(2).selectOption({ label: monthNames[m - 1] });
    await selects.nth(3).selectOption(String(y));
    await page.waitForTimeout(1500);

    const dayLinks = page.getByRole("link", { name: String(d), exact: true });
    const dayCount = await dayLinks.count();
    console.log(`day link '${d}' count:`, dayCount);

    if (dayCount === 0) {
      const calText = await page.locator("table").first().innerText().catch(() => "(no table)");
      console.log("calendar snippet:", calText.slice(0, 300));
      await browser.close();
      return;
    }

    await dayLinks.first().click();
    await page.waitForTimeout(1500);

    const slotLinks = page.getByRole("link", {
      name: /\d{1,2}:\d{2}\s*(AM|PM)-\d{1,2}:\d{2}\s*(AM|PM)/i,
    });
    const slotCount = await slotLinks.count();
    console.log("slot count:", slotCount);
    for (let i = 0; i < Math.min(slotCount, 15); i++) {
      const label = (await slotLinks.nth(i).innerText()).replace(/\d+$/, "").trim();
      console.log(`  slot[${i}]:`, label);
    }
  }

  await browser.close();
}

async function main() {
  const dates = process.argv.slice(2);
  if (dates.length === 0) dates.push("2026-07-04", "2026-07-07", "2026-07-10");
  for (const date of dates) {
    await probe(date);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
