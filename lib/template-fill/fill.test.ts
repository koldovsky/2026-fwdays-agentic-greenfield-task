import { describe, expect, it } from "vitest";
import { parse } from "node-html-parser";
import { amountToCursive } from "../locale-helpers";
import type { DocumentSession } from "../document-session/types";
import {
  computePriceTotal,
  fillActHtml,
  fillInvoiceHtml,
  INVOICE_TEMPLATE_FILENAME,
} from "./index";

function fixtureSession(
  overrides: Partial<DocumentSession> = {},
): DocumentSession {
  return {
    guid: "11111111-1111-4111-8111-111111111111",
    "doc-type": "invoice_act",
    "current-step": 6,
    completed: false,
    date: "2021-05-15",
    "invoice-number": "42",
    "act-number": "7",
    client: {
      "full-name": "Клієнт Тест",
      inn: "1111111111",
      phone: "+380111111111",
      acc: "UA111",
      bank: "Банк Клієнта",
      "mfo-bank": "300001",
      addr: "Київ, вул. Клієнтська 1",
    },
    "done-by": {
      "full-name": "Виконавець Тест",
      inn: "2222222222",
      phone: "+380222222222",
      acc: "UA222",
      bank: "Банк Виконавця",
      "mfo-bank": "300002",
      addr: "Львів, вул. Виконавча 2",
    },
    services: [
      {
        "sign-name": "dev",
        "service-name": "Розробка",
        amount: 2,
        price: 1000,
      },
    ],
    "updated-at": "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

function textFor(html: string, selector: string): string {
  const root = parse(html);
  const el = root.querySelector(selector);
  return el?.textContent?.trim() ?? "";
}

function allTexts(html: string, selector: string): string[] {
  const root = parse(html);
  return root
    .querySelectorAll(selector)
    .map((el) => el.textContent?.trim() ?? "");
}

describe("computePriceTotal", () => {
  it("TC-24: equals Σ(amount × price)", () => {
    const services = [
      { "sign-name": "a", "service-name": "A", amount: 2, price: 1000 },
      { "sign-name": "b", "service-name": "B", amount: 1.5, price: 200 },
    ];
    expect(computePriceTotal(services)).toBe(2 * 1000 + 1.5 * 200);
  });
});

describe("fillInvoiceHtml", () => {
  it("loads templates/invoce.html (BC-07)", async () => {
    const html = await fillInvoiceHtml(fixtureSession());
    expect(html.length).toBeGreaterThan(100);
    expect(INVOICE_TEMPLATE_FILENAME).toBe("invoce.html");
  });

  it("TC-15: invoice anchors are present", async () => {
    const session = fixtureSession();
    const html = await fillInvoiceHtml(session);
    const total = computePriceTotal(session.services);

    expect(textFor(html, '[data-prefilled="client-full-name"]')).toBe(
      "Клієнт Тест",
    );
    expect(textFor(html, '[data-prefilled="done-by-full-name"]')).toBe(
      "Виконавець Тест",
    );
    expect(textFor(html, '[data-prefilled="done-by-inn"]')).toBe("2222222222");
    expect(textFor(html, '[data-prefilled="amount-cursive"]')).toBe(
      amountToCursive(total),
    );
    expect(textFor(html, '[data-prefilled="date"]')).toBe("15.05.2021");
    expect(textFor(html, '[data-prefilled="date-cursive"]')).toBe(
      "15 травня 2021 р.",
    );
    expect(textFor(html, '[data-prefilled="service-cursive"]')).toBe(
      "Розробка",
    );
    expect(textFor(html, '[data-prefilled="done_amount"]')).toBe("2");
    expect(textFor(html, ".service-price")).toBe("1000,00");
    expect(textFor(html, '[data-prefilled="price-total"]')).toBe("2000,00");
  });

  it("TC-24: price-total matches line math", async () => {
    const session = fixtureSession({
      services: [
        { "sign-name": "a", "service-name": "A", amount: 3, price: 250 },
        { "sign-name": "b", "service-name": "B", amount: 2, price: 100 },
      ],
    });
    const expected = computePriceTotal(session.services);
    const html = await fillInvoiceHtml(session);
    const displayed = textFor(html, '[data-prefilled="price-total"]');
    expect(Number(displayed.replace(",", "."))).toBe(expected);
    expect(textFor(html, '[data-prefilled="amount-cursive"]')).toBe(
      amountToCursive(expected),
    );
  });

  it("two services render two rows with correct cells", async () => {
    const session = fixtureSession({
      services: [
        { "sign-name": "a", "service-name": "Послуга А", amount: 2, price: 500 },
        { "sign-name": "b", "service-name": "Послуга Б", amount: 1, price: 300 },
      ],
    });
    const html = await fillInvoiceHtml(session);
    const rows = parse(html).querySelectorAll("tr.service-row");
    expect(rows).toHaveLength(2);
    expect(allTexts(html, ".service-name")).toEqual([
      "Послуга А",
      "Послуга Б",
    ]);
    expect(allTexts(html, ".service-qty")).toEqual(["2", "1"]);
    expect(allTexts(html, ".service-price")).toEqual(["500,00", "300,00"]);
    expect(allTexts(html, ".service-sum")).toEqual(["1000,00", "300,00"]);
  });
});

describe("fillActHtml", () => {
  it("TC-16: act anchors are present", async () => {
    const session = fixtureSession();
    const html = await fillActHtml(session);
    const total = computePriceTotal(session.services);

    expect(textFor(html, '[data-prefilled="client-full-name"]')).toBe(
      "Клієнт Тест",
    );
    expect(textFor(html, '[data-prefilled="done-by-full-name"]')).toBe(
      "Виконавець Тест",
    );
    expect(textFor(html, '[data-prefilled="client-inn"]')).toBe("1111111111");
    expect(textFor(html, '[data-prefilled="amount-total-cursive"]')).toBe(
      amountToCursive(total),
    );
    // FR-14 amount-cursive — class wrapper + total cursive text
    expect(html).toContain(amountToCursive(total));
    expect(parse(html).querySelector(".amount-cursive")).toBeTruthy();
  });

  it("aliases data-cursive to date-cursive", async () => {
    const html = await fillActHtml(fixtureSession());
    expect(textFor(html, '[data-prefilled="data-cursive"]')).toBe(
      "15 травня 2021 р.",
    );
  });
});

describe("docTypeAllowsPreview", () => {
  it("filters by doc-type", async () => {
    const { docTypeAllowsPreview } = await import("./preview-type");
    expect(docTypeAllowsPreview("invoice", "invoice")).toBe(true);
    expect(docTypeAllowsPreview("invoice", "act")).toBe(false);
    expect(docTypeAllowsPreview("act", "invoice")).toBe(false);
    expect(docTypeAllowsPreview("act", "act")).toBe(true);
    expect(docTypeAllowsPreview("invoice_act", "invoice")).toBe(true);
    expect(docTypeAllowsPreview("invoice_act", "act")).toBe(true);
  });
});
