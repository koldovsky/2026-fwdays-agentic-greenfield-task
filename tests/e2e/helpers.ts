import type { Page } from "@playwright/test";

/** Clear persisted profile so each test starts from defaults. */
export async function clearProfile(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("prokhidnyi:profile:v1");
    } catch {
      /* private browsing */
    }
  });
}

export async function gotoPlanner(page: Page) {
  await page.goto("/");
  await page.getByRole("heading", { name: "Оціни свої шанси на бюджет" }).waitFor();
}
