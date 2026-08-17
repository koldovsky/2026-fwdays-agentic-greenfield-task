import { getBrowser } from "./browser";

/** Render filled HTML to an A4 PDF buffer (printBackground enabled). */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
